import assert from 'node:assert/strict';
import test from 'node:test';

import { calculatePortfolioSummary } from '../supabase/functions/_shared/portfolio.ts';

test('portfolio summary calculates valuation, pnl and concentration', () => {
  const result = calculatePortfolioSummary([
    {
      id: 'a',
      symbol: '2330',
      name: '台積電',
      averageCost: 900,
      quantityShares: 1000,
      currentPrice: 1000,
      riskScore: 30,
      signal: 'green',
    },
    {
      id: 'b',
      symbol: '2454',
      name: '聯發科',
      averageCost: 1200,
      quantityShares: 500,
      currentPrice: 1100,
      riskScore: 60,
      signal: 'yellow',
    },
  ]);

  assert.equal(result.totalCostBasis, 1_500_000);
  assert.equal(result.totalMarketValue, 1_550_000);
  assert.equal(result.totalUnrealizedPnl, 50_000);
  assert.equal(result.totalReturnPct, 3.33);
  assert.equal(result.positions[0].concentrationPct, 64.52);
  assert.match(result.alerts[0], /集中度偏高/);
});

test('missing prices are excluded and disclosed', () => {
  const result = calculatePortfolioSummary([
    {
      id: 'a',
      symbol: '9999',
      name: '缺資料',
      averageCost: 10,
      quantityShares: 1000,
      currentPrice: null,
      riskScore: 80,
      signal: 'red',
    },
  ]);

  assert.equal(result.totalMarketValue, 0);
  assert.equal(result.missingPriceCount, 1);
  assert.equal(result.highRiskCount, 1);
  assert.ok(result.alerts.some((alert) => alert.includes('缺少有效收盤價')));
});
