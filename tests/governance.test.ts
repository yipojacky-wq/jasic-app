import assert from 'node:assert/strict';
import test from 'node:test';

import {
  currentTermsVersion,
  hasAcceptedCurrentTerms,
} from '../src/lib/governance';
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

test('current terms require matching version and acceptance timestamp', () => {
  assert.equal(
    hasAcceptedCurrentTerms({
      termsVersion: currentTermsVersion,
      termsAcceptedAt: '2026-06-20T12:00:00+08:00',
    }),
    true,
  );
  assert.equal(
    hasAcceptedCurrentTerms({
      termsVersion: 'alpha-0.9',
      termsAcceptedAt: '2026-06-20T12:00:00+08:00',
    }),
    false,
  );
  assert.equal(
    hasAcceptedCurrentTerms({
      termsVersion: currentTermsVersion,
      termsAcceptedAt: null,
    }),
    false,
  );
});
