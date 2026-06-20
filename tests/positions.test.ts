import assert from 'node:assert/strict';
import test from 'node:test';

import {
  horizonFromLabel,
  horizonLabel,
  lotsToShares,
  sharesToLots,
} from '../src/lib/positions';

test('Taiwan lots and shares convert without losing fractional lots', () => {
  assert.equal(lotsToShares(1), 1000);
  assert.equal(lotsToShares(0.125), 125);
  assert.equal(sharesToLots(2500), 2.5);
  assert.equal(sharesToLots(125), 0.125);
});

test('investment horizon labels round-trip', () => {
  assert.equal(horizonLabel('swing'), '波段');
  assert.equal(horizonFromLabel('波段'), 'swing');
  assert.equal(horizonFromLabel('未知'), 'medium');
});
