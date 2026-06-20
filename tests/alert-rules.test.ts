import assert from 'node:assert/strict';
import test from 'node:test';

import {
  alertRuleLabel,
  normalizeAlertThreshold,
} from '../supabase/functions/_shared/alertRules.ts';

test('alert thresholds are normalized into safe ranges', () => {
  assert.equal(normalizeAlertThreshold('score_change', 0), 1);
  assert.equal(normalizeAlertThreshold('score_change', 7.28), 7.3);
  assert.equal(normalizeAlertThreshold('score_change', 99), 25);
  assert.equal(normalizeAlertThreshold('risk_level', 20), 40);
  assert.equal(normalizeAlertThreshold('risk_level', 82.6), 83);
  assert.equal(normalizeAlertThreshold('risk_level', 100), 95);
});

test('invalid values use conservative defaults', () => {
  assert.equal(normalizeAlertThreshold('score_change', 'x'), 5);
  assert.equal(normalizeAlertThreshold('risk_level', undefined), 70);
  assert.equal(normalizeAlertThreshold('signal_change', 10), null);
  assert.equal(alertRuleLabel('signal_change'), '燈號變化');
});
