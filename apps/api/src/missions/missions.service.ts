import {
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service.js';
import type {
  AssignMissionDto,
  ReviewMissionSubmissionDto,
  SubmitMissionEvidenceDto,
} from './missions.dto.js';

function parseSkills(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') ? parsed : [];
  } catch {
    return [];
  }
}

function submissionView(submission: {
  id: string;
  version: number;
  clientSubmissionId: string | null;
  evidenceType: string;
  evidenceNote: string;
  status: string;
  submittedAt: Date;
  reviewedBy?: string | null;
  reviewNote?: string | null;
  reviewedAt?: Date | null;
}): Record<string, unknown> {
  return {
    id: submission.id,
    version: submission.version,
    clientSubmissionId: submission.clientSubmissionId,
    evidenceType: submission.evidenceType,
    evidenceNote: submission.evidenceNote,
    status: submission.status,
    submittedAt: submission.submittedAt,
    reviewedBy: submission.reviewedBy ?? null,
    reviewNote: submission.reviewNote ?? null,
    reviewedAt: submission.reviewedAt ?? null,
  };
}

@Injectable()
export class MissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listAssigned(studentId: string): Promise<Record<string, unknown>[]> {
    const assignments = await this.prisma.missionAssignment.findMany({
      where: { studentId },
      include: { mission: true, submissions: { orderBy: { version: 'desc' }, take: 1 } },
      orderBy: { assignedAt: 'desc' },
    });
    return assignments.map(({ mission, submissions, ...assignment }) => ({
      id: assignment.id,
      status: assignment.status,
      assignedAt: assignment.assignedAt,
      dueAt: assignment.dueAt,
      updatedAt: assignment.updatedAt,
      mission: {
        id: mission.id,
        slug: mission.slug,
        title: mission.title,
        description: mission.description,
        skills: parseSkills(mission.skills),
        estimatedMinutes: mission.estimatedMinutes,
        evidenceTypes: mission.evidenceTypes.split(',').filter(Boolean),
        isDemo: mission.isDemo,
      },
      latestSubmission: submissions[0] ? submissionView(submissions[0]) : null,
    }));
  }

  async assign(facilitatorId: string, dto: AssignMissionDto): Promise<Record<string, unknown>> {
    const student = await this.prisma.student.findUnique({ where: { id: dto.studentId } });
    if (!student) throw new NotFoundException('Student not found');
    if (student.facilitatorId !== facilitatorId) {
      throw new ForbiddenException('Student is not assigned to this facilitator');
    }

    const mission = await this.prisma.mission.findFirst({
      where: { id: dto.missionId, isPublished: true },
      select: { id: true },
    });
    if (!mission) throw new NotFoundException('Published mission not found');

    const assignment = await this.prisma.missionAssignment.upsert({
      where: { studentId_missionId: { studentId: dto.studentId, missionId: dto.missionId } },
      update: { ...(dto.dueAt ? { dueAt: new Date(dto.dueAt) } : {}) },
      create: {
        studentId: dto.studentId,
        missionId: dto.missionId,
        ...(dto.dueAt ? { dueAt: new Date(dto.dueAt) } : {}),
      },
    });
    return { id: assignment.id, status: assignment.status, assignedAt: assignment.assignedAt };
  }

  async getReviewQueue(facilitatorId: string): Promise<Record<string, unknown>[]> {
    const submissions = await this.prisma.missionSubmission.findMany({
      where: {
        status: 'PENDING',
        assignment: { student: { facilitatorId } },
      },
      include: {
        assignment: {
          include: {
            student: true,
            mission: true,
          },
        },
      },
      orderBy: { submittedAt: 'asc' },
    });

    return submissions.map(({ assignment, ...submission }) => ({
      ...submissionView(submission),
      assignmentId: assignment.id,
      assignmentStatus: assignment.status,
      assignedAt: assignment.assignedAt,
      dueAt: assignment.dueAt,
      student: {
        id: assignment.student.id,
        displayName: assignment.student.displayName,
        gradeLevel: assignment.student.gradeLevel,
      },
      mission: {
        id: assignment.mission.id,
        title: assignment.mission.title,
        isDemo: assignment.mission.isDemo,
      },
    }));
  }

  async getSubmissionHistory(
    facilitatorId: string,
    assignmentId: string,
  ): Promise<Record<string, unknown>[]> {
    const assignment = await this.prisma.missionAssignment.findUnique({
      where: { id: assignmentId },
      include: { student: true },
    });
    if (!assignment) throw new NotFoundException('Mission assignment not found');
    if (assignment.student.facilitatorId !== facilitatorId) {
      throw new ForbiddenException('Student is not assigned to this facilitator');
    }

    const submissions = await this.prisma.missionSubmission.findMany({
      where: { assignmentId },
      orderBy: { version: 'desc' },
    });
    return submissions.map(submissionView);
  }

  async review(
    facilitatorId: string,
    actorUserId: string,
    submissionId: string,
    dto: ReviewMissionSubmissionDto,
  ): Promise<Record<string, unknown>> {
    const submission = await this.prisma.missionSubmission.findUnique({
      where: { id: submissionId },
      include: { assignment: { include: { student: true, mission: true } } },
    });
    if (!submission) throw new NotFoundException('Mission submission not found');
    if (submission.assignment.student.facilitatorId !== facilitatorId) {
      throw new ForbiddenException('Student is not assigned to this facilitator');
    }
    if (submission.assignment.student.userId === actorUserId) {
      throw new ForbiddenException('Students cannot review their own submissions');
    }
    if (submission.status !== 'PENDING') {
      throw new ConflictException('This submission has already been reviewed');
    }

    const latestSubmission = await this.prisma.missionSubmission.findFirst({
      where: { assignmentId: submission.assignmentId },
      orderBy: { version: 'desc' },
      select: { id: true },
    });
    if (latestSubmission?.id !== submission.id) {
      throw new ConflictException('Only the latest submission can be reviewed');
    }

    const reviewNote = dto.reviewNote?.trim() ?? '';
    if (dto.decision !== 'APPROVE' && !reviewNote) {
      throw new BadRequestException('A review note is required when requesting changes');
    }

    const submissionStatus =
      dto.decision === 'APPROVE'
        ? 'APPROVED'
        : dto.decision === 'REJECT'
          ? 'REJECTED'
          : 'RESUBMIT_REQUIRED';
    const assignmentStatus = submissionStatus;

    return this.prisma.$transaction(async (transaction) => {
      const transition = await transaction.missionSubmission.updateMany({
        where: { id: submission.id, status: 'PENDING' },
        data: {
          status: submissionStatus,
          reviewedBy: facilitatorId,
          reviewNote: reviewNote || null,
          reviewedAt: new Date(),
        },
      });
      if (transition.count !== 1) {
        throw new ConflictException('This submission has already been reviewed');
      }

      await transaction.missionAssignment.update({
        where: { id: submission.assignmentId },
        data: { status: assignmentStatus },
      });

      const awardedBadges: { id: string; slug: string; title: string; skill: string }[] = [];
      if (dto.decision === 'APPROVE') {
        const skills = parseSkills(submission.assignment.mission.skills);
        const badges = skills.length
          ? await transaction.skillBadge.findMany({ where: { skill: { in: skills } } })
          : [];
        for (const badge of badges) {
          await transaction.studentBadge.upsert({
            where: {
              studentId_badgeId: {
                studentId: submission.assignment.studentId,
                badgeId: badge.id,
              },
            },
            update: { verifiedBy: facilitatorId },
            create: {
              studentId: submission.assignment.studentId,
              badgeId: badge.id,
              verifiedBy: facilitatorId,
            },
          });
          awardedBadges.push({
            id: badge.id,
            slug: badge.slug,
            title: badge.title,
            skill: badge.skill,
          });
        }
      }

      await transaction.auditLog.create({
        data: {
          actorId: actorUserId,
          action: `MISSION_SUBMISSION_${dto.decision}`,
          entityType: 'MissionSubmission',
          entityId: submission.id,
          detail: JSON.stringify({
            assignmentId: submission.assignmentId,
            awardedBadgeIds: awardedBadges.map((badge) => badge.id),
          }),
        },
      });

      const updated = await transaction.missionSubmission.findUniqueOrThrow({
        where: { id: submission.id },
      });
      return { ...submissionView(updated), assignmentStatus, awardedBadges };
    });
  }

  async submit(studentId: string, dto: SubmitMissionEvidenceDto): Promise<Record<string, unknown>> {
    const duplicate = await this.prisma.missionSubmission.findUnique({
      where: { clientSubmissionId: dto.clientSubmissionId },
      include: { assignment: true },
    });
    if (duplicate) {
      if (
        duplicate.assignment.studentId !== studentId ||
        duplicate.assignmentId !== dto.assignmentId
      ) {
        throw new ConflictException();
      }
      return submissionView(duplicate);
    }

    const assignment = await this.prisma.missionAssignment.findUnique({
      where: { id: dto.assignmentId },
      include: { submissions: { orderBy: { version: 'desc' }, take: 1 } },
    });
    if (!assignment || assignment.studentId !== studentId) {
      throw new NotFoundException('Mission assignment not found');
    }
    if (!['ASSIGNED', 'REJECTED', 'RESUBMIT_REQUIRED'].includes(assignment.status)) {
      throw new ConflictException('This mission already has a submission in review');
    }
    const version = (assignment.submissions[0]?.version ?? 0) + 1;

    try {
      const submission = await this.prisma.$transaction(async (transaction) => {
        const created = await transaction.missionSubmission.create({
          data: {
            assignmentId: assignment.id,
            version,
            clientSubmissionId: dto.clientSubmissionId,
            evidenceType: dto.evidenceType,
            evidenceNote: dto.evidenceNote.trim(),
            status: 'PENDING',
          },
        });
        await transaction.missionAssignment.update({
          where: { id: assignment.id },
          data: { status: 'SUBMITTED' },
        });
        await transaction.syncLog.create({
          data: {
            userId: (await transaction.student.findUniqueOrThrow({ where: { id: studentId } }))
              .userId,
            action: 'MISSION_SUBMISSION',
            entityType: 'MissionSubmission',
            entityId: created.id,
            status: 'SYNCED',
            detail: JSON.stringify({ evidenceType: dto.evidenceType }),
          },
        });
        return created;
      });
      return submissionView(submission);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const retry = await this.prisma.missionSubmission.findUnique({
          where: { clientSubmissionId: dto.clientSubmissionId },
          include: { assignment: true },
        });
        if (retry?.assignment.studentId === studentId && retry.assignmentId === dto.assignmentId) {
          return submissionView(retry);
        }
      }
      throw error;
    }
  }
}
