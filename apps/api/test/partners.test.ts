import assert from 'node:assert/strict';
import test from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../src/prisma.service.js';
import { CreatePartnerApplicationDto } from '../src/partners/partners.dto.js';
import { PartnersService } from '../src/partners/partners.service.js';

const applicationDto: CreatePartnerApplicationDto = {
  partnerType: 'NGO',
  contactName: 'Asha Rao',
  organizationName: 'Community Learning Group',
  email: 'ASHA@example.org',
  website: 'https://example.org',
  state: 'Karnataka',
  district: 'Mysuru',
  focusAreas: ['career guidance', 'digital basics'],
  message: 'We can offer monthly career conversations for learners.',
  consentAccepted: true,
};

test('partner application stores normalized contact details and consent timestamp', async () => {
  let saved: Record<string, unknown> = {};
  const now = new Date('2026-10-14T12:00:00.000Z');
  const prisma = {
    partnerApplication: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        saved = data;
        return {
          id: 'partner-1',
          ...data,
          status: 'PENDING_REVIEW',
          createdAt: now,
        };
      },
    },
  } as unknown as PrismaService;
  const service = new PartnersService(prisma);

  const result = await service.submit(applicationDto);

  assert.equal(saved.email, 'asha@example.org');
  assert.ok(saved.consentAt instanceof Date);
  assert.deepEqual(result.focusAreas, applicationDto.focusAreas);
  assert.equal(result.status, 'PENDING_REVIEW');
});

test('partner applications cannot be stored without consent', async () => {
  const prisma = {
    partnerApplication: {
      create: async () => assert.fail('application must not be stored without consent'),
    },
  } as unknown as PrismaService;
  const service = new PartnersService(prisma);

  await assert.rejects(
    service.submit({ ...applicationDto, consentAccepted: false }),
    BadRequestException,
  );
});

test('partner applications accept blank optional organization and website fields', async () => {
  const dto = plainToInstance(CreatePartnerApplicationDto, {
    ...applicationDto,
    organizationName: '',
    website: '',
    state: '',
    district: '',
  });

  assert.deepEqual(await validate(dto), []);
});
