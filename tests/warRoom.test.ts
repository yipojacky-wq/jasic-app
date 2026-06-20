import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deriveLevels,
  warRoomConclusion,
} from '../supabase/functions/_shared/warRoom.ts';

test('war room uses defensive conclusion for high risk', () => {
  assert.equal(warRoomConclusion(82, 80, 75).action, '減碼／停損檢核');
});

test('war room refuses aggressive conclusion with low confidence', () => {
  assert.equal(warRoomConclusion(90, 20, 40).action, '觀望 · 資料不足');
});

test('support and resistance derive from bounded historical percentiles', () => {
  const prices = Array.from({ length: 20 }, (_, index) => ({
    low: 90 + index,
    high: 100 + index,
  }));
  const result = deriveLevels(prices);
  assert.deepEqual(result.support, [94, 91]);
  assert.deepEqual(result.resistance, [114, 117]);
});
