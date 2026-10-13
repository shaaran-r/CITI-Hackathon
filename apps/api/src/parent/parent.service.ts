import { ForbiddenException, Injectable } from '@nestjs/common';
import { calculateReadinessScore } from '../wallet/wallet.service.js';
import { PrismaService } from '../prisma.service.js';

function parseList(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') ? parsed : [];
  } catch {
    return [];
  }
}

interface TimelineEvent {
  id: string;
  at: Date;
  type: string;
  title: string;
  detail: string;
  actor: string;
}

@Injectable()
export class ParentService {
  constructor(private readonly prisma: PrismaService) {}

  async listChildren(parentId: string): Promise<Record<string, unknown>[]> {
    const links = await this.prisma.parentStudent.findMany({
      where: { parentId },
      include: { student: { include: { profile: true } } },
      orderBy: { student: { displayName: 'asc' } },
    });
    return links.map(({ relation, student }) => ({
      id: student.id,
      displayName: student.displayName,
      gradeLevel: student.gradeLevel,
      preferredLanguage: student.profile?.preferredLanguage ?? 'hi',
      relation,
    }));
  }

  private async getLinkedStudent(parentId: string, studentId: string) {
    const link = await this.prisma.parentStudent.findUnique({
      where: { parentId_studentId: { parentId, studentId } },
      include: {
        parent: true,
        student: {
          include: {
            profile: true,
            facilitator: true,
            pathways: {
              where: { status: { in: ['SELECTED', 'RECOMMENDED'] } },
              include: { pathway: true },
              orderBy: { rank: 'asc' },
            },
            missionAssignments: {
              include: {
                mission: true,
                submissions: { orderBy: { version: 'desc' } },
              },
              orderBy: { assignedAt: 'desc' },
            },
            badges: { include: { badge: true }, orderBy: { awardedAt: 'desc' } },
            opportunityMatches: {
              where: { score: { gt: 0 } },
              include: { opportunity: true },
              orderBy: { score: 'desc' },
              take: 8,
            },
            opportunityApplications: {
              include: { opportunity: true },
              orderBy: { updatedAt: 'desc' },
              take: 8,
            },
          },
        },
      },
    });
    if (!link) throw new ForbiddenException('This child is not linked to the signed-in parent');
    return link;
  }

  async getSummary(parentId: string, studentId: string): Promise<Record<string, unknown>> {
    const { parent, student } = await this.getLinkedStudent(parentId, studentId);
    const approvedAssignments = student.missionAssignments.filter(
      (assignment) => assignment.status === 'APPROVED',
    );
    const readinessScore = calculateReadinessScore(
      student.missionAssignments.length,
      approvedAssignments.length,
      student.badges.length,
    );
    const pathwayChoice =
      student.pathways.find((item) => item.status === 'SELECTED') ?? student.pathways[0];
    const chosenPathway = pathwayChoice?.pathway;
    const matchedOpportunities = student.opportunityMatches.map((match) => ({
      id: match.opportunity.id,
      title: match.opportunity.title,
      type: match.opportunity.type,
      provider: match.opportunity.provider,
      district: match.opportunity.district,
      state: match.opportunity.state,
      deadline: match.opportunity.applyBy,
      stipendMin: match.opportunity.stipendMin,
      stipendMax: match.opportunity.stipendMax,
      score: match.score,
      reasons: parseList(match.rationale),
      facilitatorNote: match.facilitatorNote,
      isDemo: match.opportunity.isDemo,
    }));
    const facilitatorRecommendation =
      [...student.opportunityMatches]
        .filter((match) => match.recommendedAt)
        .sort((left, right) => right.recommendedAt!.getTime() - left.recommendedAt!.getTime())
        .map((match) => ({
          opportunityTitle: match.opportunity.title,
          note: match.facilitatorNote,
          recommendedAt: match.recommendedAt,
          facilitator: student.facilitator?.fullName ?? 'Facilitator',
        }))[0] ?? null;

    return {
      parent: { id: parent.id, fullName: parent.fullName },
      student: {
        id: student.id,
        displayName: student.displayName,
        gradeLevel: student.gradeLevel,
        preferredLanguage: student.profile?.preferredLanguage ?? 'hi',
        district: student.profile?.district ?? null,
        state: student.profile?.state ?? null,
        interests: parseList(student.profile?.interests ?? '[]'),
        strengths: parseList(student.profile?.strengths ?? '[]'),
      },
      pathway: chosenPathway
        ? {
            title: chosenPathway.title,
            description: chosenPathway.description,
            status: pathwayChoice.status,
            isSelected: pathwayChoice.status === 'SELECTED',
            durationWeeks: chosenPathway.durationWeeks,
            estimatedMonthlyEarningsMin: chosenPathway.estimatedMonthlyEarningsMin,
            estimatedMonthlyEarningsMax: chosenPathway.estimatedMonthlyEarningsMax,
            costGuidance:
              'Ask the facilitator or provider for current local costs; no verified cost estimate is available.',
          }
        : null,
      wallet: {
        readinessScore,
        approvedMissionCount: approvedAssignments.length,
        totalMissionCount: student.missionAssignments.length,
        badges: student.badges.map(({ badge, awardedAt }) => ({
          title: badge.title,
          skill: badge.skill,
          awardedAt,
          verified: true,
        })),
        approvedMissions: approvedAssignments.map((assignment) => ({
          title: assignment.mission.title,
          approvedAt:
            assignment.submissions.find((item) => item.status === 'APPROVED')?.reviewedAt ?? null,
          skills: parseList(assignment.mission.skills),
        })),
      },
      opportunities: matchedOpportunities,
      applications: student.opportunityApplications.map((application) => ({
        id: application.id,
        title: application.opportunity.title,
        type: application.opportunity.type,
        status: application.status,
        submittedAt: application.submittedAt,
        facilitatorNote: application.facilitatorNote,
        isDemo: application.opportunity.isDemo,
      })),
      facilitatorRecommendation,
      facilitator: student.facilitator?.fullName ?? null,
      reassurance:
        'These opportunities are suggestions, not guarantees. Please confirm safety, travel, cost, and eligibility with your facilitator and provider.',
    };
  }

  async getTimeline(parentId: string, studentId: string): Promise<Record<string, unknown>[]> {
    const { student } = await this.getLinkedStudent(parentId, studentId);
    const events: TimelineEvent[] = [];
    const facilitatorName = student.facilitator?.fullName ?? 'Facilitator';

    for (const assignment of student.missionAssignments) {
      events.push({
        id: `assigned-${assignment.id}`,
        at: assignment.assignedAt,
        type: 'MISSION_ASSIGNED',
        title: `Mission assigned: ${assignment.mission.title}`,
        detail: 'A facilitator added a practical activity.',
        actor: facilitatorName,
      });
      for (const submission of assignment.submissions) {
        events.push({
          id: `submission-${submission.id}`,
          at: submission.submittedAt,
          type: 'MISSION_SUBMITTED',
          title: `Evidence shared: ${assignment.mission.title}`,
          detail: `The student sent ${submission.evidenceType.toLowerCase()} evidence for facilitator review.`,
          actor: student.displayName,
        });
        if (!submission.reviewedAt) continue;
        events.push({
          id: `review-${submission.id}`,
          at: submission.reviewedAt,
          type: submission.status,
          title:
            submission.status === 'APPROVED'
              ? `Mission approved: ${assignment.mission.title}`
              : submission.status === 'REJECTED'
                ? `Mission review: ${assignment.mission.title}`
                : `More information requested: ${assignment.mission.title}`,
          detail: submission.reviewNote ?? 'Your facilitator reviewed the submitted evidence.',
          actor: facilitatorName,
        });
      }
    }

    for (const choice of student.pathways) {
      events.push({
        id: `pathway-${choice.id}`,
        at: choice.selectedAt ?? choice.createdAt,
        type: choice.status === 'SELECTED' ? 'PATHWAY_SELECTED' : 'PATHWAY_RECOMMENDED',
        title:
          choice.status === 'SELECTED'
            ? `Path chosen: ${choice.pathway.title}`
            : `Path suggested: ${choice.pathway.title}`,
        detail: choice.rationale,
        actor: choice.status === 'SELECTED' ? student.displayName : 'KaushalSetu',
      });
    }

    for (const match of student.opportunityMatches) {
      if (!match.recommendedAt) continue;
      events.push({
        id: `recommend-${match.id}`,
        at: match.recommendedAt,
        type: 'OPPORTUNITY_RECOMMENDED',
        title: `Opportunity suggested: ${match.opportunity.title}`,
        detail: match.facilitatorNote ?? 'A facilitator thinks this may be a useful next step.',
        actor: facilitatorName,
      });
    }

    for (const application of student.opportunityApplications) {
      if (application.helpRequestedAt) {
        events.push({
          id: `help-${application.id}`,
          at: application.helpRequestedAt,
          type: 'HELP_REQUESTED',
          title: `Help requested: ${application.opportunity.title}`,
          detail: application.helpRequestNote ?? 'The student asked for application support.',
          actor: student.displayName,
        });
      }
      if (application.submittedAt) {
        events.push({
          id: `applied-${application.id}`,
          at: application.submittedAt,
          type: 'APPLICATION_SUBMITTED',
          title: `Application submitted: ${application.opportunity.title}`,
          detail: application.opportunity.isDemo
            ? 'DEMO record: this is not a real application or offer.'
            : 'The student marked the application as submitted.',
          actor: student.displayName,
        });
      }
      if (application.reviewedAt) {
        events.push({
          id: `application-review-${application.id}`,
          at: application.reviewedAt,
          type: `APPLICATION_${application.status}`,
          title: `Application update: ${application.opportunity.title}`,
          detail:
            application.facilitatorNote ?? `Status updated to ${application.status.toLowerCase()}.`,
          actor: facilitatorName,
        });
      }
    }

    return events
      .sort((left, right) => left.at.getTime() - right.at.getTime())
      .map((event) => ({ ...event, at: event.at }));
  }
}
