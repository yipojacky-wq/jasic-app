import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isCommonStockSymbol,
  numberValue,
  rocDateToIso,
} from '../supabase/functions/_shared/normalize.ts';

test('converts ROC date to ISO date', () => {
  assert.equal(rocDateToIso('1150618'), '2026-06-18');
});

test('normalizes signed and comma-separated market values', () => {
  assert.equal(numberValue('1,234,567'), 1_234_567);
  assert.equal(numberValue('+2.02'), 2.02);
  assert.equal(numberValue('--'), null);
});

test('MVP universe accepts four-digit common stock symbols only', () => {
  assert.equal(isCommonStockSymbol('2330'), true);
  assert.equal(isCommonStockSymbol('00679B'), false);
  assert.equal(isCommonStockSymbol('00400A'), false);
});
