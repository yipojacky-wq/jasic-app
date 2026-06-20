import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeAiHistoryResult,
  normalizeStringList,
} from '../supabase/functions/_shared/aiHistory.ts';

test('AI history lists keep safe strings and enforce limits', () => {
  assert.deepEqual(
    normalizeStringList([' one ', 2, '', 'two', 'three'], 2),
    ['one', 'two'],
  );
});

test('AI history result normalizes nested Supabase relation shapes', () => {
  const result = normalizeAiHistoryResult([
    {
      action: 'HOLD',
      conclusion: '續抱',
      reasons: ['原因一', '原因二'],
      risks: ['風險一'],
      suggestions: ['建議一'],
      confidence: 120,
      model_identifier: 'model-a',
      prompt_version: 'prompt-1',
      rule_version: 'rule-1',
      created_at: '2026-06-21T00:00:00Z',
    },
  ]);

  assert.equal(result?.action, 'HOLD');
  assert.equal(result?.confidence, 100);
  assert.equal(result?.modelIdentifier, 'model-a');
  assert.equal(normalizeAiHistoryResult(null), null);
});
