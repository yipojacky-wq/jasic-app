import assert from 'node:assert/strict';
import test from 'node:test';

import {
  categoryFor,
  computeMarketMetrics,
  computeStockScore,
} from '../supabase/functions/_shared/scoring.ts';

test('market score reflects breadth and volatility', () => {
  const result = computeMarketMetrics(70, 100, 0.02);
  assert.equal(result.score, 72);
  assert.equal(result.risk, 30);
  assert.equal(result.signal, 'green');
  assert.equal(result.regime, 'risk_on');
});

test('high volatility overrides otherwise positive breadth', () => {
  const result = computeMarketMetrics(80, 100, 0.06);
  assert.equal(result.regime, 'high_volatility');
  assert.equal(result.risk, 90);
});

test('stock score is deterministic and bounded', () => {
  const result = computeStockScore({
    marketScore: 72,
    close: 110,
    ma20: 100,
    return5d: 0.04,
    institutionNet5d: 500_000,
    averageVolume20: 1_000_000,
    volatility20d: 0.025,
  });
  assert.equal(result.signal, 'green');
  assert.ok(result.total <= 100);
  assert.ok(result.institution >= 0);
  assert.ok(result.risk <= 95);
});

test('candidate category prioritizes aligned trend and institution', () => {
  assert.equal(categoryFor({ technical: 80, institution: 65 }), 'trend');
  assert.equal(categoryFor({ technical: 55, institution: 75 }), 'accumulation');
  assert.equal(categoryFor({ technical: 72, institution: 50 }), 'breakout');
  assert.equal(categoryFor({ technical: 55, institution: 55 }), 'reversal');
});
