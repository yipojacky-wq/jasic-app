import assert from 'node:assert/strict';
import test from 'node:test';

import {
  dataHealthMessage,
  dataHealthStatus,
} from '../supabase/functions/_shared/governance.ts';

test('data freshness thresholds protect stale research data', () => {
  assert.equal(dataHealthStatus(24), 'healthy');
  assert.equal(dataHealthStatus(72), 'warning');
  assert.equal(dataHealthStatus(120), 'stale');
});

test('failed and partial runs override timestamp freshness', () => {
  assert.equal(dataHealthStatus(1, 'failed'), 'stale');
  assert.equal(dataHealthStatus(1, 'partial'), 'warning');
});

test('stale status message forbids aggressive conclusions', () => {
  assert.match(dataHealthMessage('stale'), /請勿產生積極結論/);
});
