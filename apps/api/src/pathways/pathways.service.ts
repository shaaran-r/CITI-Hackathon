import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { pathwayLearningGuidance } from './pathway-guidance.js';

@Injectable()
export class PathwaysService {
  constructor(private readonly prisma: PrismaService) {}

  async recommended(studentId: string): Promise<Record<string, unknown>[]> {
    const matches = await this.prisma.studentPathway.findMany({
      where: { studentId, status: { in: ['RECOMMENDED', 'SELECTED'] } },
      include: { pathway: true },
      orderBy: { rank: 'asc' },
    });
    return matches.map(({ pathway, ...match }) => ({
      id: pathway.id,
      slug: pathway.slug,
      title: pathway.title,
      category: pathway.category,
      pathwayType: pathway.pathwayType,
      description: pathway.description,
      ...pathwayLearningGuidance(pathway.slug),
      durationWeeks: pathway.durationWeeks,
      estimatedMonthlyEarningsMin: pathway.estimatedMonthlyEarningsMin,
      estimatedMonthlyEarningsMax: pathway.estimatedMonthlyEarningsMax,
      isDemo: pathway.isDemo,
      score: match.score,
      rank: match.rank,
      rationale: match.rationale,
      status: match.status,
    }));
  }

  async select(studentId: string, pathwayId: string): Promise<{ selectedPathwayId: string }> {
    const match = await this.prisma.studentPathway.findUnique({
      where: { studentId_pathwayId: { studentId, pathwayId } },
    });
    if (!match) throw new NotFoundException('Choose one of your recommended pathways');
    await this.prisma.$transaction([
      this.prisma.studentPathway.updateMany({
        where: { studentId, status: 'SELECTED' },
        data: { status: 'RECOMMENDED', selectedAt: null },
      }),
      this.prisma.studentPathway.update({
        where: { id: match.id },
        data: { status: 'SELECTED', selectedAt: new Date() },
      }),
    ]);
    return { selectedPathwayId: pathwayId };
  }
}
