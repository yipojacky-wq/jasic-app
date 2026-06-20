import assert from 'node:assert/strict';
import test from 'node:test';

import {
  aiCheckLimits,
  validateAiCheckInput,
} from '../supabase/functions/_shared/aiInput.ts';

test('AI Check input normalizes safe Taiwan position data', () => {
  const result = validateAiCheckInput({
    symbol: ' 2330 ',
    cost: '980.5',
    lots: '0.125',
    horizon: '中期',
    riskProfile: 'balanced',
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.value, {
    symbol: '2330',
    cost: 980.5,
    lots: 0.125,
    quantityShares: 125,
    costBasis: 122562.5,
    horizon: 'medium',
    riskProfile: 'balanced',
  });
});

test('AI Check input rejects malformed symbols and unknown enums', () => {
  const result = validateAiCheckInput({
    symbol: '2330.TW',
    cost: 100,
    lots: 1,
    horizon: 'forever',
    riskProfile: 'maximum',
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.symbol ?? '', /四碼/);
  assert.match(result.errors.horizon ?? '', /投資期間/);
  assert.match(result.errors.riskProfile ?? '', /風險偏好/);
});

test('AI Check input enforces odd-lot and cost-basis limits', () => {
  const tooSmall = validateAiCheckInput({
    symbol: '2330',
    cost: 100,
    lots: 0.0001,
    horizon: 'medium',
    riskProfile: 'balanced',
  });
  assert.equal(tooSmall.ok, false);
  assert.match(tooSmall.errors.lots ?? '', /0.001/);

  const tooLarge = validateAiCheckInput({
    symbol: '2330',
    cost: aiCheckLimits.maximumCost,
    lots: aiCheckLimits.maximumLots,
    horizon: 'long',
    riskProfile: 'growth',
  });
  assert.equal(tooLarge.ok, false);
  assert.match(tooLarge.errors.costBasis ?? '', /風險上限/);
});
