import assert from 'node:assert/strict';
import test from 'node:test';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../src/prisma.service.js';
import { MissionsService } from '../src/missions/missions.service.js';
import { calculateReadinessScore } from '../src/wallet/wallet.service.js';

interface ReviewHarness {
  service: MissionsService;
  counts: { badges: number; audits: number; reviews: number };
  current: {
    id: string;
    version: number;
    assignmentId: string;
    clientSubmissionId: string;
    evidenceType: string;
    evidenceNote: string;
    status: string;
    submittedAt: Date;
    reviewedBy: string | null;
    reviewNote: string | null;
    reviewedAt: Date | null;
    assignment: {
      id: string;
      studentId: string;
      status: string;
      student: { id: string; userId: string; facilitatorId: string };
      mission: { id: string; skills: string };
    };
  };
}

function makeReviewHarness(
  overrides: {
    facilitatorId?: string;
    studentUserId?: string;
    latestSubmissionId?: string;
  } = {},
): ReviewHarness {
  const current: ReviewHarness['current'] = {
    id: 'submission-1',
    version: 1,
    assignmentId: 'assignment-1',
    clientSubmissionId: 'client-submission-0001',
    evidenceType: 'NOTE',
    evidenceNote: 'I completed the water map.',
    status: 'PENDING',
    submittedAt: new Date('2026-10-13T12:00:00.000Z'),
    reviewedBy: null,
    reviewNote: null,
    reviewedAt: null,
    assignment: {
      id: 'assignment-1',
      studentId: 'student-1',
      status: 'SUBMITTED',
      student: {
        id: 'student-1',
        userId: overrides.studentUserId ?? 'student-user-1',
        facilitatorId: overrides.facilitatorId ?? 'facilitator-1',
      },
      mission: { id: 'mission-1', skills: '["observation"]' },
    },
  };
  const counts = { badges: 0, audits: 0, reviews: 0 };
  const transaction = {
    missionSubmission: {
      updateMany: async ({
        where,
        data,
      }: {
        where: { status: string };
        data: Record<string, unknown>;
      }) => {
        if (current.status !== where.status) return { count: 0 };
        Object.assign(current, data);
        counts.reviews += 1;
        return { count: 1 };
      },
      findUniqueOrThrow: async () => current,
    },
    missionAssignment: {
      update: async ({ data }: { data: { status: string } }) => {
        current.assignment.status = data.status;
      },
    },
    skillBadge: {
      findMany: async () => [
        { id: 'badge-1', slug: 'observer', title: 'Careful observer', skill: 'observation' },
      ],
    },
    studentBadge: {
      upsert: async () => {
        counts.badges += 1;
      },
    },
    auditLog: {
      create: async () => {
        counts.audits += 1;
      },
    },
  };
  const prisma = {
    missionSubmission: {
      findUnique: async () => current,
      findFirst: async () => ({ id: overrides.latestSubmissionId ?? current.id }),
    },
    $transaction: async (callback: (client: typeof transaction) => Promise<unknown>) =>
      callback(transaction),
  };
  return { service: new MissionsService(prisma as unknown as PrismaService), counts, current };
}

test('approval transitions once, writes one audit event, and upserts a skill badge once', async () => {
  const { service, counts, current } = makeReviewHarness();
  const decision = { decision: 'APPROVE' as const };

  const result = await service.review(
    'facilitator-1',
    'facilitator-user-1',
    'submission-1',
    decision,
  );
  assert.equal(result.status, 'APPROVED');
  assert.equal(current.assignment.status, 'APPROVED');
  assert.equal(counts.badges, 1);
  assert.equal(counts.audits, 1);

  await assert.rejects(
    service.review('facilitator-1', 'facilitator-user-1', 'submission-1', decision),
    ConflictException,
  );
  assert.equal(counts.badges, 1);
  assert.equal(counts.audits, 1);
});

test('requesting a resubmission requires feedback and leaves the old record reviewable only once', async () => {
  const { service, counts, current } = makeReviewHarness();
  await assert.rejects(
    service.review('facilitator-1', 'facilitator-user-1', 'submission-1', {
      decision: 'REQUEST_RESUBMISSION',
    }),
  );
  assert.equal(counts.reviews, 0);

  const result = await service.review('facilitator-1', 'facilitator-user-1', 'submission-1', {
    decision: 'REQUEST_RESUBMISSION',
    reviewNote: 'Please add what you observed at the second water point.',
  });
  assert.equal(result.status, 'RESUBMIT_REQUIRED');
  assert.equal(current.assignment.status, 'RESUBMIT_REQUIRED');
  assert.equal(counts.badges, 0);
  assert.equal(counts.audits, 1);
});

test('facilitator scope, self-review, and latest-submission rules are enforced', async () => {
  const wrongFacilitator = makeReviewHarness({ facilitatorId: 'facilitator-2' }).service;
  await assert.rejects(
    wrongFacilitator.review('facilitator-1', 'facilitator-user-1', 'submission-1', {
      decision: 'APPROVE',
    }),
    ForbiddenException,
  );

  const selfReview = makeReviewHarness({ studentUserId: 'facilitator-user-1' }).service;
  await assert.rejects(
    selfReview.review('facilitator-1', 'facilitator-user-1', 'submission-1', {
      decision: 'APPROVE',
    }),
    ForbiddenException,
  );

  const olderSubmission = makeReviewHarness({ latestSubmissionId: 'submission-2' }).service;
  await assert.rejects(
    olderSubmission.review('facilitator-1', 'facilitator-user-1', 'submission-1', {
      decision: 'APPROVE',
    }),
    ConflictException,
  );
});

test('wallet readiness score is deterministic, bounded, and zero for an empty wallet', () => {
  assert.equal(calculateReadinessScore(0, 0, 0), 0);
  assert.equal(calculateReadinessScore(4, 2, 2), 55);
  assert.equal(calculateReadinessScore(2, 2, 8), 100);
});
