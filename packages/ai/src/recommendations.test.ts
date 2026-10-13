import assert from 'node:assert/strict';
import test from 'node:test';
import type { OnboardingAnswers, PathwayCandidate } from '@kaushalsetu/types';
import { recommendPathways } from './recommendations';

const answers: OnboardingAnswers = {
  gradeLevel: '10',
  preferredLanguage: 'hi',
  interests: ['agriculture'],
  strengths: ['communication'],
  dailyAvailableMinutes: 30,
  mobility: 'LOCAL_ONLY',
  deviceAccess: 'SHARED',
  incomeUrgency: 'HIGH',
  futureGoal: 'EARN_SOON',
};

const catalog: PathwayCandidate[] = [
  {
    id: 'quick',
    slug: 'local-farm-services',
    title: 'Local farm services',
    category: 'agriculture',
    pathwayType: 'QUICK_EARNING',
    description: 'Help nearby farms with seasonal tasks.',
    durationWeeks: 8,
    estimatedMonthlyEarningsMin: 1000,
    estimatedMonthlyEarningsMax: 3000,
    requiredSkills: ['communication'],
    mobilityRequired: 'LOCAL_ONLY',
  },
  {
    id: 'vocational',
    slug: 'farm-equipment',
    title: 'Farm equipment basics',
    category: 'agriculture',
    pathwayType: 'VOCATIONAL_GROWTH',
    description: 'Learn equipment care and safe use.',
    durationWeeks: 16,
    estimatedMonthlyEarningsMin: 2000,
    estimatedMonthlyEarningsMax: 5000,
    requiredSkills: ['problem-solving'],
    mobilityRequired: 'LOCAL_ONLY',
  },
  {
    id: 'academic',
    slug: 'agriculture-science',
    title: 'Agriculture science',
    category: 'science',
    pathwayType: 'LONG_TERM_ACADEMIC',
    description: 'Continue studies in agricultural science.',
    durationWeeks: 52,
    estimatedMonthlyEarningsMin: 0,
    estimatedMonthlyEarningsMax: 0,
    requiredSkills: ['observation'],
    mobilityRequired: 'SOME_TRAVEL',
  },
];

test('returns one deterministic recommendation for each pathway track', () => {
  const first = recommendPathways(answers, catalog);
  const second = recommendPathways(answers, catalog);

  assert.deepEqual(first, second);
  assert.deepEqual(
    first.map(({ pathwayType }) => pathwayType),
    ['QUICK_EARNING', 'VOCATIONAL_GROWTH', 'LONG_TERM_ACADEMIC'],
  );
  assert.deepEqual(
    first.map(({ rank }) => rank),
    [1, 2, 3],
  );
});

test('explains which student constraints informed a recommendation', () => {
  const recommendations = recommendPathways(answers, catalog);

  assert.match(recommendations[0]?.rationale ?? '', /quicker route to earning/);
  assert.match(recommendations[0]?.rationale ?? '', /close to home/);
});

test('fails clearly when a pathway track has no candidates', () => {
  assert.throws(() => recommendPathways(answers, catalog.slice(0, 2)), /LONG_TERM_ACADEMIC/);
});
