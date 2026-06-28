import assert from 'node:assert/strict';
import test from 'node:test';

import {
  aiCheckPromptVersion,
  aiCheckResponseSchemaVersion,
  buildAiCheckGovernanceAudit,
  buildAiCheckSystemPrompt,
  containsProhibitedAiCheckClaim,
  determineAllowedAiCheckActions,
  validateAiCheckStructuredResult,
} from '../supabase/functions/_shared/aiGovernance.ts';

test('AI Check governance versions are explicit and auditable', () => {
  assert.match(aiCheckPromptVersion, /^ai-check-\d+\.\d+\.\d+$/);
  assert.match(aiCheckResponseSchemaVersion, /^ai-check-response-\d+\.\d+\.\d+$/);

  const audit = buildAiCheckGovernanceAudit({
    allowedActions: ['HOLD', 'WAIT', 'REDUCE'],
    dataAsOf: '2026-06-28T00:00:00+08:00',
    modelIdentifier: 'gpt-test',
    ruleVersion: 'stock-score-1.0.0',
  });

  assert.deepEqual(audit, {
    promptVersion: aiCheckPromptVersion,
    responseSchemaVersion: aiCheckResponseSchemaVersion,
    ruleVersion: 'stock-score-1.0.0',
    modelIdentifier: 'gpt-test',
    dataAsOf: '2026-06-28T00:00:00+08:00',
    allowedActions: ['HOLD', 'WAIT', 'REDUCE'],
  });
});

test('AI Check action guardrail becomes defensive when market or confidence is weak', () => {
  assert.deepEqual(
    determineAllowedAiCheckActions({
      marketRegime: 'risk_off',
      stockRiskScore: 20,
      stockTotalScore: 90,
      stockConfidenceScore: 90,
      riskProfile: 'growth',
    }),
    ['WAIT', 'REDUCE', 'STOP_LOSS'],
  );
  assert.deepEqual(
    determineAllowedAiCheckActions({
      marketRegime: 'risk_on',
      stockRiskScore: 20,
      stockTotalScore: 74.9,
      stockConfidenceScore: 90,
      riskProfile: 'growth',
    }),
    ['HOLD', 'WAIT', 'REDUCE'],
  );
  assert.deepEqual(
    determineAllowedAiCheckActions({
      marketRegime: 'risk_on',
      stockRiskScore: 20,
      stockTotalScore: 88,
      stockConfidenceScore: 90,
      riskProfile: 'growth',
    }),
    ['ADD', 'HOLD', 'WAIT', 'REDUCE'],
  );
});

test('AI Check prompt forbids profit guarantees and automatic trading', () => {
  const prompt = buildAiCheckSystemPrompt(['HOLD', 'WAIT', 'REDUCE']);
  assert.match(prompt, /Do not guarantee profit/);
  assert.match(prompt, /Do not place trades/);
  assert.match(prompt, /HOLD, WAIT, REDUCE/);
});

test('AI Check structured result rejects disallowed actions and prohibited claims', () => {
  const validResult = {
    action: 'HOLD',
    conclusion: 'Maintain the position while monitoring risk.',
    reasons: ['Score remains constructive.', 'Confidence is acceptable.'],
    risks: ['Market volatility can change quickly.'],
    suggestions: ['Review again after fresh market data.'],
    confidence: 72,
  };
  assert.equal(
    validateAiCheckStructuredResult(validResult, ['HOLD', 'WAIT', 'REDUCE']).ok,
    true,
  );

  assert.deepEqual(
    validateAiCheckStructuredResult(
      { ...validResult, action: 'ADD' },
      ['HOLD', 'WAIT', 'REDUCE'],
    ),
    { ok: false, reason: 'AI action violated rule guardrail.' },
  );

  assert.equal(containsProhibitedAiCheckClaim('這檔股票保證獲利'), true);
  assert.equal(containsProhibitedAiCheckClaim('We will place the order now.'), true);
  assert.deepEqual(
    validateAiCheckStructuredResult(
      { ...validResult, conclusion: '這檔股票保證獲利。' },
      ['HOLD', 'WAIT', 'REDUCE'],
    ),
    { ok: false, reason: 'AI output contains a prohibited claim.' },
  );
});
