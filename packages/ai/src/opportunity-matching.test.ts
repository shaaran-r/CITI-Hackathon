import assert from 'node:assert/strict';
import test from 'node:test';
import type { OpportunityCandidate, OpportunityStudentProfile } from '@kaushalsetu/types';
import { matchOpportunities } from './opportunity-matching';

const student: OpportunityStudentProfile = {
  gradeLevel: '10',
  district: 'Mysuru',
  state: 'Karnataka',
  preferredLanguage: 'hi',
  mobility: 'LOCAL_ONLY',
  incomeUrgency: 'HIGH',
  readinessScore: 55,
  selectedPathwaySlugs: ['local-farm-services'],
  verifiedBadgeSlugs: ['community-observer'],
};

const opportunities: OpportunityCandidate[] = [
  {
    id: 'fit',
    slug: 'mysuru-field-internship',
    title: '[DEMO] Field internship',
    type: 'INTERNSHIP',
    provider: '[DEMO] Local center',
    description: 'Practice field surveys.',
    district: 'Mysuru',
    state: 'Karnataka',
    applyBy: null,
    stipendMin: 0,
    stipendMax: 2000,
    requiredDocuments: ['school id'],
    eligibility: { minimumGrade: 9, languages: ['hi'], minimumReadiness: 40 },
    pathwaySlugs: ['local-farm-services'],
    requiredBadgeSlugs: ['community-observer'],
    isDemo: true,
  },
  {
    id: 'district',
    slug: 'other-district-training',
    title: '[DEMO] Other district training',
    type: 'TRAINING',
    provider: '[DEMO] State center',
    description: 'Not nearby.',
    district: 'Mandya',
    state: 'Karnataka',
    applyBy: null,
    stipendMin: null,
    stipendMax: null,
    requiredDocuments: [],
    eligibility: {},
    pathwaySlugs: [],
    requiredBadgeSlugs: [],
    isDemo: true,
  },
  {
    id: 'badge',
    slug: 'badge-required-scholarship',
    title: '[DEMO] Badge scholarship',
    type: 'SCHOLARSHIP',
    provider: '[DEMO] School',
    description: 'Requires another badge.',
    district: null,
    state: 'Karnataka',
    applyBy: null,
    stipendMin: null,
    stipendMax: null,
    requiredDocuments: [],
    eligibility: { requiredBadgeSlugs: ['solar-safety'] },
    pathwaySlugs: [],
    requiredBadgeSlugs: [],
    isDemo: true,
  },
  {
    id: 'grade',
    slug: 'higher-grade-opportunity',
    title: '[DEMO] Higher grade program',
    type: 'APPRENTICESHIP',
    provider: '[DEMO] Workshop',
    description: 'For older learners.',
    district: null,
    state: null,
    applyBy: null,
    stipendMin: null,
    stipendMax: null,
    requiredDocuments: [],
    eligibility: { minimumGrade: 11 },
    pathwaySlugs: [],
    requiredBadgeSlugs: [],
    isDemo: true,
  },
];

test('hard-filters location, grade, and missing badges before ranking', () => {
  const result = matchOpportunities(student, opportunities);

  assert.deepEqual(
    result.filter((item) => item.eligible).map((item) => item.slug),
    ['mysuru-field-internship'],
  );
  assert.match(
    result.find((item) => item.slug === 'other-district-training')?.missingRequirements[0] ?? '',
    /Mandya/,
  );
  assert.match(
    result.find((item) => item.slug === 'badge-required-scholarship')?.missingRequirements[0] ?? '',
    /solar safety/,
  );
  assert.match(
    result.find((item) => item.slug === 'higher-grade-opportunity')?.missingRequirements[0] ?? '',
    /class 11/,
  );
});

test('ranking and explanations are deterministic and use wallet/pathway evidence', () => {
  const first = matchOpportunities(student, opportunities);
  const second = matchOpportunities(student, opportunities);
  assert.deepEqual(first, second);
  assert.ok(first[0]?.score >= 80);
  assert.ok(first[0]?.reasons.some((reason) => reason.includes('verified badge')));
  assert.ok(first[0]?.reasons.some((reason) => reason.includes('selected pathway')));
});
