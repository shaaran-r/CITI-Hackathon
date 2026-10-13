import assert from 'node:assert/strict';
import test from 'node:test';
import { ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../src/prisma.service.js';
import { ParentService } from '../src/parent/parent.service.js';

test('parent summary and timeline reject students that are not linked to that parent', async () => {
  const prisma = {
    parentStudent: {
      findUnique: async () => null,
    },
  };
  const parent = new ParentService(prisma as unknown as PrismaService);

  await assert.rejects(parent.getSummary('parent-1', 'student-2'), ForbiddenException);
  await assert.rejects(parent.getTimeline('parent-1', 'student-2'), ForbiddenException);
});

test('parent child list only returns explicit parent-student relationships', async () => {
  const prisma = {
    parentStudent: {
      findMany: async () => [
        {
          relation: 'GUARDIAN',
          student: {
            id: 'student-1',
            displayName: 'Demo Student 1',
            gradeLevel: '9',
            profile: { preferredLanguage: 'hi' },
          },
        },
      ],
    },
  };
  const parent = new ParentService(prisma as unknown as PrismaService);

  assert.deepEqual(await parent.listChildren('parent-1'), [
    {
      id: 'student-1',
      displayName: 'Demo Student 1',
      gradeLevel: '9',
      preferredLanguage: 'hi',
      relation: 'GUARDIAN',
    },
  ]);
});
