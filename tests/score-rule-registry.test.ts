import assert from 'node:assert/strict';
import test from 'node:test';

import {
  currentDiscoveryFunnelRule,
  currentMarketScoreRule,
  currentStockScoreRule,
  scoreFeatureVersion,
  scoreRuleRegistry,
} from '../supabase/functions/_shared/scoreRuleRegistry.ts';

test('score rule registry exposes explicit current versions', () => {
  assert.equal(scoreFeatureVersion, 'features-0.1.0');
  assert.equal(currentMarketScoreRule.version, 'market-score-provisional-0.1.0');
  assert.equal(currentStockScoreRule.version, 'stock-score-provisional-0.1.0');
  assert.equal(currentDiscoveryFunnelRule.version, 'discovery-funnel-provisional-0.1.0');
});

test('score rule registry keeps provisional staging rules auditable', () => {
  for (const rule of Object.values(scoreRuleRegistry)) {
    assert.match(rule.version, /-provisional-\d+\.\d+\.\d+$/);
    assert.equal(rule.status, 'provisional');
    assert.equal(rule.minimumHistoryDays, 20);
    assert.match(rule.changeNote, /not a production investment formula/i);
  }
});

test('discovery funnel registry matches Top 20 MVP contract', () => {
  assert.equal(currentDiscoveryFunnelRule.config.candidateLimit, 20);
  assert.equal(currentDiscoveryFunnelRule.config.minimumTotalScore, 50);
  assert.equal(currentDiscoveryFunnelRule.config.maximumRiskScore, 80);
});
