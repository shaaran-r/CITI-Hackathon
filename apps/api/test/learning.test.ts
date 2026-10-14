import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../src/prisma.service.js';
import type { CreateLearningModuleDto } from '../src/learning/learning.dto.js';
import { LearningAdviceService } from '../src/learning/learning-advice.service.js';
import { LearningService } from '../src/learning/learning.service.js';

const baseDto: CreateLearningModuleDto = {
  title: 'Safe electrical basics',
  description: 'Practice safe observation and identify when to ask for help.',
  category: 'Electrical skills',
  language: 'hi',
  lessons: ['Name three safety checks', 'Ask a trained adult before practice'],
  pricingModel: 'SUBSCRIPTION',
  priceInr: 50,
};

test('learning modules retain facilitator ownership and pricing metadata', async () => {
  let saved: Record<string, unknown> = {};
  const now = new Date('2026-10-14T12:00:00.000Z');
  const prisma = {
    learningModule: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        saved = data;
        return {
          id: 'module-1',
          ...data,
          lessons: data.lessons,
          status: 'DRAFT',
          createdAt: now,
          updatedAt: now,
        };
      },
    },
  } as unknown as PrismaService;
  const service = new LearningService(prisma);

  const result = await service.create('facilitator-1', baseDto);

  assert.equal(saved.facilitatorId, 'facilitator-1');
  assert.equal(saved.pricingModel, 'SUBSCRIPTION');
  assert.equal(saved.priceInr, 50);
  assert.deepEqual(result.lessons, baseDto.lessons);
  assert.equal(result.status, 'DRAFT');
});

test('free modules cannot carry a price', async () => {
  const prisma = {
    learningModule: { create: async () => assert.fail('invalid module must not be persisted') },
  } as unknown as PrismaService;
  const service = new LearningService(prisma);

  await assert.rejects(
    service.create('facilitator-1', { ...baseDto, pricingModel: 'FREE', priceInr: 10 }),
    BadRequestException,
  );
});

test('facilitators cannot publish another facilitator’s module', async () => {
  const prisma = {
    learningModule: { findFirst: async () => null },
  } as unknown as PrismaService;
  const service = new LearningService(prisma);

  await assert.rejects(
    service.publish('facilitator-1', 'module-owned-by-someone-else'),
    NotFoundException,
  );
});

test('learning advice stays useful and source-linked without an LLM provider', async () => {
  const prisma = {
    student: {
      findUnique: async () => ({
        gradeLevel: '11',
        profile: {
          preferredLanguage: 'hi',
          interests: '["agriculture"]',
          strengths: '["observation"]',
        },
        pathways: [{ pathway: { slug: 'agriculture-science', title: 'Agriculture science' } }],
      }),
    },
  } as unknown as PrismaService;
  const config = { get: () => undefined } as unknown as ConfigService;
  const service = new LearningAdviceService(prisma, config);

  const advice = await service.forStudent('student-1');

  assert.equal(advice.mode, 'RULES_BASED');
  assert.ok(advice.nextSteps.length > 0);
  assert.ok(advice.nextSteps.every((step) => step.sources[0]?.url.startsWith('https://')));
});
