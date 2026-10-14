import assert from 'node:assert/strict';
import test from 'node:test';
import { InitiativesService } from '../src/initiatives/initiatives.service.js';

test('official source directory covers the initiatives in the product brief', () => {
  const sources = new InitiativesService().list();

  assert.deepEqual(
    sources.map((source) => source.id),
    [
      'diksha',
      'swayam',
      'skill-india-digital',
      'naps',
      'national-scholarship-portal',
      'aishe',
      'bhashini',
    ],
  );
  assert.ok(sources.every((source) => source.officialUrl.startsWith('https://')));
  assert.ok(sources.every((source) => source.dataStatus === 'REFERENCE_ONLY'));
});
