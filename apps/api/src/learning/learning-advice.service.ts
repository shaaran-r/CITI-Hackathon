import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { LearningAdvice, PathwayLearningGuidance } from '@kaushalsetu/types';
import { officialInitiativeSources } from '../initiatives/initiatives.service.js';
import { PrismaService } from '../prisma.service.js';
import { pathwayLearningGuidance } from '../pathways/pathway-guidance.js';

interface ChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
}

function parseList(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') ? parsed : [];
  } catch {
    return [];
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

@Injectable()
export class LearningAdviceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async forStudent(studentId: string): Promise<LearningAdvice> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        profile: true,
        pathways: {
          where: { status: { in: ['RECOMMENDED', 'SELECTED'] } },
          include: { pathway: true },
          orderBy: { rank: 'asc' },
        },
      },
    });
    if (!student?.profile)
      throw new NotFoundException('Complete onboarding to get learning advice');

    const pathway = student.pathways[0]?.pathway;
    const guidance = pathwayLearningGuidance(pathway?.slug ?? '');
    const fallback = this.rulesBasedAdvice(
      student.profile.preferredLanguage,
      parseList(student.profile.interests),
      pathway?.title ?? null,
      guidance,
    );
    const endpoint = this.config.get<string>('LLM_CHAT_COMPLETIONS_URL')?.trim();
    const model = this.config.get<string>('LLM_MODEL')?.trim();
    if (!endpoint || !model) return fallback;

    try {
      return await this.generateWithModel(endpoint, model, fallback, {
        gradeLevel: student.gradeLevel,
        preferredLanguage: student.profile.preferredLanguage,
        interests: parseList(student.profile.interests),
        strengths: parseList(student.profile.strengths),
        pathway: pathway?.title ?? null,
        sources: officialInitiativeSources.map(({ id, name, category, overview, officialUrl }) => ({
          id,
          name,
          category,
          overview,
          officialUrl,
        })),
      });
    } catch {
      return fallback;
    }
  }

  private rulesBasedAdvice(
    language: string,
    interests: string[],
    pathwayTitle: string | null,
    guidance: PathwayLearningGuidance,
  ): LearningAdvice {
    const interestSummary =
      interests.length > 0 ? interests.slice(0, 3).join(', ') : 'your interests';
    return {
      mode: 'RULES_BASED',
      summary: pathwayTitle
        ? `Your ${pathwayTitle} path is a starting point based on ${interestSummary}. Review one learning step at a time with your facilitator.`
        : `Start with one small learning step based on ${interestSummary}, then review it with your facilitator.`,
      nextSteps: guidance.learningSteps.slice(0, 3).map((step) => ({
        text: `${step.title}: ${step.description}`,
        sources: [{ name: step.sourceName, url: step.sourceUrl }],
      })),
      note: `Guidance only; verify course details and eligibility on official portals. Language preference: ${language}.`,
    };
  }

  private async generateWithModel(
    endpoint: string,
    model: string,
    fallback: LearningAdvice,
    learnerContext: Record<string, unknown>,
  ): Promise<LearningAdvice> {
    const apiKey = this.config.get<string>('LLM_API_KEY')?.trim();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              'You are a careful education and livelihood guide for rural Indian learners. Use only the supplied source list. Do not invent exam eligibility, deadlines, scholarships, courses, income, or job openings. Do not treat an exam as required unless the source explicitly says so. Return JSON with summary and steps; each step must cite source IDs from the supplied list.',
          },
          {
            role: 'user',
            content: JSON.stringify(learnerContext),
          },
        ],
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return fallback;
    const payload = (await response.json()) as ChatCompletionResponse;
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return fallback;
    const parsed = asRecord(JSON.parse(content));
    const summary = typeof parsed?.summary === 'string' ? parsed.summary.trim().slice(0, 700) : '';
    const rawSteps = Array.isArray(parsed?.steps) ? parsed.steps : [];
    if (!summary) return fallback;

    const sourceById = new Map(officialInitiativeSources.map((source) => [source.id, source]));
    const nextSteps = rawSteps.flatMap((rawStep) => {
      const step = asRecord(rawStep);
      const text = typeof step?.text === 'string' ? step.text.trim().slice(0, 400) : '';
      const ids = Array.isArray(step?.sourceIds)
        ? step.sourceIds.filter((id): id is string => typeof id === 'string')
        : [];
      const sources = ids.flatMap((id) => {
        const source = sourceById.get(id);
        return source ? [{ name: source.name, url: source.officialUrl }] : [];
      });
      return text && sources.length > 0 ? [{ text, sources }] : [];
    });
    if (nextSteps.length === 0) return fallback;
    return {
      mode: 'LLM',
      summary,
      nextSteps: nextSteps.slice(0, 4),
      note: 'AI-generated guidance, not an eligibility decision. Verify current details at each official source.',
    };
  }
}
