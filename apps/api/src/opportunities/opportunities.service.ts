import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { matchOpportunities } from '@kaushalsetu/ai/opportunity-matching';
import { calculateReadinessScore } from '../wallet/wallet.service.js';
import { opportunityTypes } from '@kaushalsetu/types';
import type {
  IncomeUrgency,
  Mobility,
  OpportunityCandidate,
  OpportunityEligibility,
  OpportunityRecommendation,
  OpportunityStudentProfile,
  OpportunityType,
} from '@kaushalsetu/types';
import { PrismaService } from '../prisma.service.js';
import type {
  BookmarkOpportunityDto,
  RecommendOpportunityDto,
  RequestApplicationHelpDto,
  StartOpportunityApplicationDto,
  UpdateFacilitatorApplicationDto,
  UpdateStudentApplicationDto,
} from './opportunities.dto.js';

interface OpportunityRow {
  id: string;
  slug: string;
  title: string;
  type: string;
  provider: string;
  description: string;
  eligibility: string;
  district: string | null;
  state: string | null;
  stipendMin: number | null;
  stipendMax: number | null;
  requiredBadgeSlugs: string;
  requiredDocuments: string;
  pathwaySlugs: string;
  applyBy: Date | null;
  isDemo: boolean;
}

function parseStringList(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') ? parsed : [];
  } catch {
    return [];
  }
}

function parseEligibility(value: string): OpportunityEligibility {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as OpportunityEligibility;
  } catch {
    return {};
  }
}

function parseReasons(value: string): string[] {
  return parseStringList(value);
}

function validMobility(value: string | undefined): Mobility {
  return value === 'SOME_TRAVEL' || value === 'CAN_RELOCATE' ? value : 'LOCAL_ONLY';
}

function validUrgency(value: string | undefined): IncomeUrgency {
  return value === 'HIGH' || value === 'LOW' ? value : 'MEDIUM';
}

function toCandidate(row: OpportunityRow): OpportunityCandidate | null {
  if (!opportunityTypes.includes(row.type as OpportunityType)) return null;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    type: row.type as OpportunityType,
    provider: row.provider,
    description: row.description,
    district: row.district,
    state: row.state,
    applyBy: row.applyBy?.toISOString() ?? null,
    stipendMin: row.stipendMin,
    stipendMax: row.stipendMax,
    requiredDocuments: parseStringList(row.requiredDocuments),
    eligibility: parseEligibility(row.eligibility),
    pathwaySlugs: parseStringList(row.pathwaySlugs),
    requiredBadgeSlugs: parseStringList(row.requiredBadgeSlugs),
    isDemo: row.isDemo,
  };
}

function matchView(
  recommendation: OpportunityRecommendation,
  match: { savedAt: Date | null; rationale?: string } | null,
  application: { id: string; status: string } | null,
): Record<string, unknown> {
  return {
    ...recommendation,
    savedAt: match?.savedAt ?? null,
    reasons: match?.rationale ? parseReasons(match.rationale) : recommendation.reasons,
    applicationId: application?.id ?? null,
    applicationStatus: application?.status ?? null,
  };
}

@Injectable()
export class OpportunitiesService {
  constructor(private readonly prisma: PrismaService) {}

  private async getStudentProfile(studentId: string): Promise<OpportunityStudentProfile> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        profile: true,
        badges: { include: { badge: true } },
        pathways: { where: { status: 'SELECTED' }, include: { pathway: true } },
        missionAssignments: { select: { status: true } },
      },
    });
    if (!student) throw new NotFoundException('Student not found');

    const approvedCount = student.missionAssignments.filter(
      (item) => item.status === 'APPROVED',
    ).length;
    return {
      gradeLevel: student.gradeLevel ?? '',
      district: student.profile?.district ?? null,
      state: student.profile?.state ?? null,
      preferredLanguage: student.profile?.preferredLanguage ?? 'hi',
      mobility: validMobility(student.profile?.mobility),
      incomeUrgency: validUrgency(student.profile?.incomeUrgency),
      readinessScore: calculateReadinessScore(
        student.missionAssignments.length,
        approvedCount,
        student.badges.length,
      ),
      selectedPathwaySlugs: student.pathways.map((item) => item.pathway.slug),
      verifiedBadgeSlugs: student.badges.map((item) => item.badge.slug),
    };
  }

  private async rankForStudent(studentId: string): Promise<{
    recommendations: OpportunityRecommendation[];
    matches: Map<string, { savedAt: Date | null; rationale: string }>;
    applications: Map<string, { id: string; status: string }>;
  }> {
    const [student, rows, matchRows, applicationRows] = await Promise.all([
      this.getStudentProfile(studentId),
      this.prisma.opportunity.findMany({ where: { isPublished: true } }),
      this.prisma.opportunityMatch.findMany({ where: { studentId } }),
      this.prisma.opportunityApplication.findMany({ where: { studentId } }),
    ]);
    const candidates = rows.flatMap((row) => {
      const candidate = toCandidate(row);
      return candidate ? [candidate] : [];
    });
    const recommendations = matchOpportunities(student, candidates);
    const matches = new Map(matchRows.map((match) => [match.opportunityId, match]));
    const applications = new Map(
      applicationRows.map((application) => [application.opportunityId, application]),
    );

    for (const recommendation of recommendations) {
      if (!recommendation.eligible) continue;
      const rationale = JSON.stringify(recommendation.reasons);
      const match = await this.prisma.opportunityMatch.upsert({
        where: {
          studentId_opportunityId: { studentId, opportunityId: recommendation.id },
        },
        update: {
          score: recommendation.score,
          rationale,
          generatedAt: new Date(),
        },
        create: {
          studentId,
          opportunityId: recommendation.id,
          score: recommendation.score,
          rationale,
        },
      });
      matches.set(recommendation.id, match);
    }
    return { recommendations, matches, applications };
  }

  async list(studentId: string, matchedOnly = false): Promise<Record<string, unknown>[]> {
    const { recommendations, matches, applications } = await this.rankForStudent(studentId);
    return recommendations
      .filter((recommendation) => !matchedOnly || recommendation.eligible)
      .map((recommendation) =>
        matchView(
          recommendation,
          matches.get(recommendation.id) ?? null,
          applications.get(recommendation.id) ?? null,
        ),
      );
  }

  async detail(studentId: string, opportunityId: string): Promise<Record<string, unknown>> {
    const opportunities = await this.list(studentId);
    const opportunity = opportunities.find((item) => item.id === opportunityId);
    if (!opportunity) throw new NotFoundException('Opportunity not found');
    return opportunity;
  }

  async bookmark(
    studentId: string,
    dto: BookmarkOpportunityDto,
  ): Promise<{ opportunityId: string; savedAt: Date | null }> {
    const opportunity = await this.prisma.opportunity.findFirst({
      where: { id: dto.opportunityId, isPublished: true },
      select: { id: true },
    });
    if (!opportunity) throw new NotFoundException('Opportunity not found');
    const savedAt = dto.saved ? new Date() : null;
    const match = await this.prisma.opportunityMatch.upsert({
      where: { studentId_opportunityId: { studentId, opportunityId: opportunity.id } },
      update: { savedAt },
      create: {
        studentId,
        opportunityId: opportunity.id,
        score: 0,
        rationale: JSON.stringify(['Saved by student']),
        savedAt,
      },
    });
    return { opportunityId: opportunity.id, savedAt: match.savedAt };
  }

  async startApplication(
    studentId: string,
    dto: StartOpportunityApplicationDto,
  ): Promise<Record<string, unknown>> {
    const opportunity = await this.prisma.opportunity.findFirst({
      where: { id: dto.opportunityId, isPublished: true },
    });
    if (!opportunity) throw new NotFoundException('Opportunity not found');
    const application = await this.prisma.opportunityApplication.upsert({
      where: { studentId_opportunityId: { studentId, opportunityId: opportunity.id } },
      update: {},
      create: {
        studentId,
        opportunityId: opportunity.id,
        status: 'IN_PROGRESS',
        documentsChecklist: opportunity.requiredDocuments,
      },
    });
    return this.applicationView(application, opportunity);
  }

  async listApplications(studentId: string): Promise<Record<string, unknown>[]> {
    const applications = await this.prisma.opportunityApplication.findMany({
      where: { studentId },
      include: { opportunity: true },
      orderBy: { updatedAt: 'desc' },
    });
    return applications.map((application) =>
      this.applicationView(application, application.opportunity),
    );
  }

  async updateStudentApplication(
    studentId: string,
    applicationId: string,
    dto: UpdateStudentApplicationDto,
  ): Promise<Record<string, unknown>> {
    const application = await this.prisma.opportunityApplication.findUnique({
      where: { id: applicationId },
      include: { opportunity: true },
    });
    if (!application || application.studentId !== studentId) {
      throw new NotFoundException('Application not found');
    }
    if (application.status === dto.status)
      return this.applicationView(application, application.opportunity);
    if (application.status !== 'IN_PROGRESS' || dto.status !== 'SUBMITTED') {
      throw new ConflictException('Application status cannot transition from its current state');
    }
    const updated = await this.prisma.opportunityApplication.update({
      where: { id: applicationId },
      data: { status: 'SUBMITTED', submittedAt: new Date() },
      include: { opportunity: true },
    });
    return this.applicationView(updated, updated.opportunity);
  }

  async requestHelp(
    studentId: string,
    applicationId: string,
    dto: RequestApplicationHelpDto,
  ): Promise<{ id: string; helpRequestedAt: Date }> {
    const application = await this.prisma.opportunityApplication.findUnique({
      where: { id: applicationId },
      select: { id: true, studentId: true },
    });
    if (!application || application.studentId !== studentId) {
      throw new NotFoundException('Application not found');
    }
    return this.prisma.opportunityApplication
      .update({
        where: { id: applicationId },
        data: { helpRequestedAt: new Date(), helpRequestNote: dto.note?.trim() || null },
        select: { id: true, helpRequestedAt: true },
      })
      .then((updated) => ({ id: updated.id, helpRequestedAt: updated.helpRequestedAt! }));
  }

  async recommendByFacilitator(
    facilitatorId: string,
    actorUserId: string,
    dto: RecommendOpportunityDto,
  ): Promise<Record<string, unknown>> {
    const student = await this.prisma.student.findUnique({ where: { id: dto.studentId } });
    if (!student) throw new NotFoundException('Student not found');
    if (student.facilitatorId !== facilitatorId) {
      throw new ForbiddenException('Student is not assigned to this facilitator');
    }
    const opportunity = await this.prisma.opportunity.findFirst({
      where: { id: dto.opportunityId, isPublished: true },
    });
    if (!opportunity) throw new NotFoundException('Opportunity not found');
    const currentList = await this.list(dto.studentId);
    const current = currentList.find((item) => item.id === opportunity.id);
    const reasons = Array.isArray(current?.reasons) ? current.reasons : [];
    const rationale = JSON.stringify(reasons);
    const match = await this.prisma.opportunityMatch.upsert({
      where: {
        studentId_opportunityId: { studentId: dto.studentId, opportunityId: opportunity.id },
      },
      update: {
        rationale,
        recommendedById: actorUserId,
        facilitatorNote: dto.note?.trim() || null,
        recommendedAt: new Date(),
      },
      create: {
        studentId: dto.studentId,
        opportunityId: opportunity.id,
        score: typeof current?.score === 'number' ? current.score : 0,
        rationale,
        recommendedById: actorUserId,
        facilitatorNote: dto.note?.trim() || null,
        recommendedAt: new Date(),
      },
    });
    return {
      opportunityId: opportunity.id,
      score: match.score,
      recommendedAt: match.recommendedAt,
    };
  }

  async getFacilitatorStudentOpportunities(
    facilitatorId: string,
    studentId: string,
  ): Promise<Record<string, unknown>[]> {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Student not found');
    if (student.facilitatorId !== facilitatorId) {
      throw new ForbiddenException('Student is not assigned to this facilitator');
    }
    return this.list(studentId);
  }

  async getFacilitatorApplicationQueue(facilitatorId: string): Promise<Record<string, unknown>[]> {
    const applications = await this.prisma.opportunityApplication.findMany({
      where: {
        student: { facilitatorId },
        OR: [{ helpRequestedAt: { not: null } }, { status: 'SUBMITTED' }],
      },
      include: { student: true, opportunity: true },
      orderBy: { updatedAt: 'desc' },
    });
    return applications.map((application) => ({
      ...this.applicationView(application, application.opportunity),
      student: {
        id: application.student.id,
        displayName: application.student.displayName,
        gradeLevel: application.student.gradeLevel,
      },
    }));
  }

  async updateApplicationByFacilitator(
    facilitatorId: string,
    actorUserId: string,
    applicationId: string,
    dto: UpdateFacilitatorApplicationDto,
  ): Promise<Record<string, unknown>> {
    const application = await this.prisma.opportunityApplication.findUnique({
      where: { id: applicationId },
      include: { student: true, opportunity: true },
    });
    if (!application) throw new NotFoundException('Application not found');
    if (application.student.facilitatorId !== facilitatorId) {
      throw new ForbiddenException('Student is not assigned to this facilitator');
    }
    const allowed =
      application.status === dto.status ||
      (application.status === 'SUBMITTED' && ['SELECTED', 'REJECTED'].includes(dto.status));
    if (!allowed)
      throw new ConflictException('Application status cannot transition from its current state');

    const updated = await this.prisma.$transaction(async (transaction) => {
      const saved = await transaction.opportunityApplication.update({
        where: { id: applicationId },
        data: {
          status: dto.status,
          facilitatorNote: dto.facilitatorNote?.trim() || null,
          reviewedById: actorUserId,
          reviewedAt: ['SELECTED', 'REJECTED'].includes(dto.status) ? new Date() : null,
        },
        include: { opportunity: true },
      });
      await transaction.auditLog.create({
        data: {
          actorId: actorUserId,
          action: `OPPORTUNITY_APPLICATION_${dto.status}`,
          entityType: 'OpportunityApplication',
          entityId: applicationId,
          detail: JSON.stringify({
            studentId: application.studentId,
            opportunityId: application.opportunityId,
          }),
        },
      });
      return saved;
    });
    return this.applicationView(updated, updated.opportunity);
  }

  private applicationView(
    application: {
      id: string;
      opportunityId: string;
      status: string;
      notes: string | null;
      documentsChecklist: string;
      helpRequestedAt: Date | null;
      helpRequestNote: string | null;
      facilitatorNote: string | null;
      submittedAt: Date | null;
      updatedAt: Date;
    },
    opportunity: { id: string; title: string; type: string; applyBy: Date | null; isDemo: boolean },
  ): Record<string, unknown> {
    return {
      id: application.id,
      opportunityId: application.opportunityId,
      status: application.status,
      notes: application.notes,
      documentsChecklist: parseStringList(application.documentsChecklist),
      helpRequestedAt: application.helpRequestedAt,
      helpRequestNote: application.helpRequestNote,
      facilitatorNote: application.facilitatorNote,
      submittedAt: application.submittedAt,
      updatedAt: application.updatedAt,
      opportunity,
    };
  }
}
