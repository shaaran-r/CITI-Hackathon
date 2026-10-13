import { Injectable, NotFoundException } from '@nestjs/common';
import { recommendPathways } from '@kaushalsetu/ai';
import { pathwayTypes } from '@kaushalsetu/types';
import type { OnboardingAnswers, PathwayCandidate, PathwayType } from '@kaushalsetu/types';
import { PrismaService } from '../prisma.service.js';
import type { CompleteProfileDto } from './profiling.dto.js';

function parseList(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') ? parsed : [];
  } catch {
    return [];
  }
}

@Injectable()
export class ProfilingService {
  constructor(private readonly prisma: PrismaService) {}

  async complete(studentId: string, answers: CompleteProfileDto): Promise<Record<string, unknown>> {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Student profile not found');

    const pathwayRows = await this.prisma.pathway.findMany({ where: { isPublished: true } });
    const catalog: PathwayCandidate[] = pathwayRows.flatMap((row) => {
      if (!pathwayTypes.includes(row.pathwayType as PathwayType)) return [];
      return [
        {
          id: row.id,
          slug: row.slug,
          title: row.title,
          category: row.category,
          pathwayType: row.pathwayType as PathwayType,
          description: row.description,
          durationWeeks: row.durationWeeks,
          estimatedMonthlyEarningsMin: row.estimatedMonthlyEarningsMin,
          estimatedMonthlyEarningsMax: row.estimatedMonthlyEarningsMax,
          requiredSkills: parseList(row.requiredSkills),
          mobilityRequired: row.mobilityRequired as OnboardingAnswers['mobility'],
        },
      ];
    });
    const recommendations = recommendPathways(answers, catalog);
    const completedAt = new Date();

    await this.prisma.$transaction(async (transaction) => {
      await transaction.student.update({
        where: { id: studentId },
        data: { gradeLevel: answers.gradeLevel },
      });
      await transaction.studentProfile.upsert({
        where: { studentId },
        update: {
          preferredLanguage: answers.preferredLanguage,
          district: answers.district?.trim() || null,
          state: answers.state?.trim() || null,
          interests: JSON.stringify(answers.interests),
          strengths: JSON.stringify(answers.strengths),
          dailyAvailableMinutes: answers.dailyAvailableMinutes,
          mobility: answers.mobility,
          deviceAccess: answers.deviceAccess,
          incomeUrgency: answers.incomeUrgency,
          futureGoal: answers.futureGoal,
          completedAt,
        },
        create: {
          studentId,
          preferredLanguage: answers.preferredLanguage,
          district: answers.district?.trim() || null,
          state: answers.state?.trim() || null,
          interests: JSON.stringify(answers.interests),
          strengths: JSON.stringify(answers.strengths),
          dailyAvailableMinutes: answers.dailyAvailableMinutes,
          mobility: answers.mobility,
          deviceAccess: answers.deviceAccess,
          incomeUrgency: answers.incomeUrgency,
          futureGoal: answers.futureGoal,
          completedAt,
        },
      });
      for (const recommendation of recommendations) {
        await transaction.studentPathway.upsert({
          where: { studentId_pathwayId: { studentId, pathwayId: recommendation.id } },
          update: {
            status: 'RECOMMENDED',
            score: recommendation.score,
            rank: recommendation.rank,
            rationale: recommendation.rationale,
          },
          create: {
            studentId,
            pathwayId: recommendation.id,
            score: recommendation.score,
            rank: recommendation.rank,
            rationale: recommendation.rationale,
          },
        });
      }
    });

    return this.getResult(studentId);
  }

  async getResult(studentId: string): Promise<Record<string, unknown>> {
    const profile = await this.prisma.studentProfile.findUnique({ where: { studentId } });
    if (!profile?.completedAt)
      throw new NotFoundException('Complete onboarding to get recommendations');
    const pathwayRows = await this.prisma.studentPathway.findMany({
      where: { studentId, status: { in: ['RECOMMENDED', 'SELECTED'] } },
      include: { pathway: true },
      orderBy: { rank: 'asc' },
    });
    return {
      studentId,
      profile: {
        ...profile,
        interests: parseList(profile.interests),
        strengths: parseList(profile.strengths),
      },
      recommendations: pathwayRows.map(({ pathway, ...match }) => ({
        id: pathway.id,
        slug: pathway.slug,
        title: pathway.title,
        category: pathway.category,
        pathwayType: pathway.pathwayType,
        description: pathway.description,
        durationWeeks: pathway.durationWeeks,
        estimatedMonthlyEarningsMin: pathway.estimatedMonthlyEarningsMin,
        estimatedMonthlyEarningsMax: pathway.estimatedMonthlyEarningsMax,
        isDemo: pathway.isDemo,
        score: match.score,
        rank: match.rank,
        rationale: match.rationale,
        status: match.status,
      })),
    };
  }
}
