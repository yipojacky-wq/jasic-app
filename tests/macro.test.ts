import assert from 'node:assert/strict';
import test from 'node:test';

import {
  macroFreshness,
  macroImpact,
  normalizeMacroHistory,
} from '../supabase/functions/_shared/macro.ts';

const now = new Date('2026-06-21T00:00:00Z');

test('macro freshness respects daily and monthly release cadence', () => {
  assert.equal(macroFreshness('2026-06-19T00:00:00Z', 'daily', now).status, 'fresh');
  assert.equal(macroFreshness('2026-06-15T00:00:00Z', 'daily', now).status, 'warning');
  assert.equal(macroFreshness('2026-06-01T00:00:00Z', 'daily', now).status, 'stale');
  assert.equal(macroFreshness('2026-05-10T00:00:00Z', 'monthly', now).status, 'fresh');
  assert.equal(macroFreshness(null, 'daily', now).status, 'missing');
});

test('macro state produces deterministic market impact language', () => {
  assert.equal(macroImpact('positive'), '支撐市場風險承擔');
  assert.equal(macroImpact('negative'), '壓抑市場風險承擔');
  assert.equal(macroImpact('neutral'), '對市場影響中性');
});

test('macro history is normalized oldest to newest', () => {
  const history = normalizeMacroHistory([
    { observation_date: '2026-06-20', value: '18.6' },
    { observation_date: '2026-06-19', value: '17.9' },
  ]);
  assert.deepEqual(history.map((item) => item.date), ['2026-06-19', '2026-06-20']);
});
