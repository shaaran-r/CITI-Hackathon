import assert from 'node:assert/strict';
import test from 'node:test';
import { pathwayLearningGuidance } from '../src/pathways/pathway-guidance.js';

test('learning guidance is source-linked and does not invent exams for vocational paths', () => {
  const solar = pathwayLearningGuidance('solar-technician');
  const agriculture = pathwayLearningGuidance('agriculture-science');

  assert.ok(solar.learningSteps.length >= 2);
  assert.ok(solar.learningSteps.every((step) => step.sourceUrl.startsWith('https://')));
  assert.equal(solar.examOptions.length, 0);
  assert.equal(agriculture.examOptions[0]?.name, 'CUET (UG)');
  assert.match(agriculture.examOptions[0]?.relevance ?? '', /Some participating universities/);
});
