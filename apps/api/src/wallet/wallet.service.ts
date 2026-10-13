import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

export function calculateReadinessScore(
  totalMissions: number,
  approvedMissions: number,
  badgeCount: number,
): number {
  const missionScore = totalMissions ? Math.round((approvedMissions / totalMissions) * 70) : 0;
  return Math.min(100, missionScore + Math.min(30, badgeCount * 10));
}

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getWallet(studentId: string): Promise<Record<string, unknown>> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        badges: { include: { badge: true }, orderBy: { awardedAt: 'desc' } },
        pathways: {
          where: { status: 'SELECTED' },
          include: { pathway: true },
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
        missionAssignments: {
          include: { mission: true, submissions: { orderBy: { version: 'desc' }, take: 1 } },
        },
      },
    });
    if (!student) throw new NotFoundException('Student not found');

    const approvedMissions = student.missionAssignments.filter(
      (assignment) => assignment.status === 'APPROVED',
    );
    const badges = student.badges.map(({ badge, ...award }) => ({
      id: badge.id,
      slug: badge.slug,
      title: badge.title,
      description: badge.description,
      skill: badge.skill,
      awardedAt: award.awardedAt,
      verified: true,
    }));
    const verifiedSkills = [...new Set(badges.map((badge) => badge.skill))];
    const readinessScore = calculateReadinessScore(
      student.missionAssignments.length,
      approvedMissions.length,
      badges.length,
    );
    const selectedPathway = student.pathways[0]?.pathway;
    const submissions = student.missionAssignments.flatMap((assignment) => assignment.submissions);
    const recentFeedback = await this.prisma.missionSubmission.findMany({
      where: { assignment: { studentId }, reviewNote: { not: null } },
      orderBy: { reviewedAt: 'desc' },
      take: 5,
      select: { id: true, status: true, reviewNote: true, reviewedAt: true },
    });

    return {
      student: { id: student.id, displayName: student.displayName, gradeLevel: student.gradeLevel },
      readinessScore,
      verifiedSkills,
      badges,
      missionSummary: {
        total: student.missionAssignments.length,
        approved: approvedMissions.length,
        awaitingReview: student.missionAssignments.filter((item) => item.status === 'SUBMITTED')
          .length,
        facilitatorValidations: submissions.filter(
          (item) => item.status === 'APPROVED' && item.reviewedBy !== null,
        ).length,
      },
      pathwayProgress: selectedPathway
        ? {
            title: selectedPathway.title,
            pathwayType: selectedPathway.pathwayType,
            status: 'SELECTED',
            progressPercent: null,
            trackingAvailable: false,
          }
        : null,
      recentComments: recentFeedback.map((item) => ({
        submissionId: item.id,
        status: item.status,
        note: item.reviewNote,
        reviewedAt: item.reviewedAt,
      })),
    };
  }

  async getHistory(studentId: string): Promise<Record<string, unknown>[]> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true },
    });
    if (!student) throw new NotFoundException('Student not found');
    const submissions = await this.prisma.missionSubmission.findMany({
      where: { assignment: { studentId } },
      include: { assignment: { include: { mission: true } } },
      orderBy: { submittedAt: 'desc' },
      take: 30,
    });
    return submissions.map((submission) => ({
      id: submission.id,
      status: submission.status,
      evidenceType: submission.evidenceType,
      evidenceNote: submission.evidenceNote,
      submittedAt: submission.submittedAt,
      reviewedAt: submission.reviewedAt,
      reviewNote: submission.reviewNote,
      mission: { id: submission.assignment.mission.id, title: submission.assignment.mission.title },
    }));
  }
}
