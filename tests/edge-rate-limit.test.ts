import assert from 'node:assert/strict';
import test from 'node:test';

import {
  edgeRateLimitPolicies,
  rateLimitDecision,
  rateLimitMessage,
} from '../supabase/functions/_shared/edgeRateLimit.ts';

test('edge rate-limit policies match Package 3 abuse-control notes', () => {
  assert.equal(edgeRateLimitPolicies['ai-check'].limit, 20);
  assert.equal(edgeRateLimitPolicies['ai-check'].windowSeconds, 60 * 60);
  assert.equal(edgeRateLimitPolicies['report-generate'].limit, 10);
  assert.equal(edgeRateLimitPolicies['user-data-export'].limit, 5);
  assert.equal(edgeRateLimitPolicies['account-delete'].limit, 1);

  for (const policy of Object.values(edgeRateLimitPolicies)) {
    assert.equal(policy.scope, 'user');
    assert.equal(policy.actionWhenLimited.status, 429);
    assert.equal(policy.actionWhenLimited.code, 'RATE_LIMITED');
    assert.equal(policy.actionWhenLimited.skipOpenAi, true);
    assert.equal(policy.actionWhenLimited.skipPartialWrites, true);
  }
});

test('rate-limit decision allows requests inside the limit and blocks after limit', () => {
  const policy = edgeRateLimitPolicies['ai-check'];
  const now = new Date('2026-07-11T10:10:00+08:00');
  const allowed = rateLimitDecision(
    policy,
    {
      count: 19,
      windowStartedAt: '2026-07-11T10:00:00+08:00',
    },
    now,
  );
  assert.equal(allowed.allowed, true);
  assert.equal(allowed.nextCount, 20);

  const blocked = rateLimitDecision(
    policy,
    {
      count: 20,
      windowStartedAt: '2026-07-11T10:00:00+08:00',
    },
    now,
  );
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.nextCount, 21);
  assert.equal(blocked.retryAfterSeconds, 3000);
});

test('rate-limit window resets after policy window expires', () => {
  const policy = edgeRateLimitPolicies['ai-check'];
  const decision = rateLimitDecision(
    policy,
    {
      count: 20,
      windowStartedAt: '2026-07-11T10:00:00+08:00',
    },
    new Date('2026-07-11T11:00:01+08:00'),
  );
  assert.equal(decision.allowed, true);
  assert.equal(decision.nextCount, 1);
  assert.equal(decision.retryAfterSeconds, 0);
});

test('rate-limit message avoids exposing internal implementation details', () => {
  assert.match(rateLimitMessage(125), /3 minute/);
  assert.doesNotMatch(rateLimitMessage(125), /OpenAI|service-role|CRON_SECRET/);
});
