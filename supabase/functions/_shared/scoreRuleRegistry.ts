export const scoreFeatureVersion = 'features-0.1.0' as const;

export const scoreRuleRegistry = {
  marketScore: {
    ruleType: 'market_score',
    version: 'market-score-provisional-0.1.0',
    status: 'provisional',
    minimumHistoryDays: 20,
    config: {
      breadthWeight: 0.7,
      volatilityRiskWeight: 0.3,
      greenScoreThreshold: 65,
      yellowScoreThreshold: 45,
      highVolatilityRiskThreshold: 65,
    },
    changeNote:
      'Initial deterministic market score pipeline for staging validation; not a production investment formula.',
  },
  stockScore: {
    ruleType: 'stock_score',
    version: 'stock-score-provisional-0.1.0',
    status: 'provisional',
    minimumHistoryDays: 20,
    config: {
      marketWeight: 0.25,
      institutionWeight: 0.25,
      technicalWeight: 0.35,
      chipWeight: 0.1,
      oiWeight: 0.05,
      greenSignalThreshold: 72,
      yellowSignalThreshold: 52,
    },
    changeNote:
      'Initial deterministic stock score pipeline for staging validation; not a production investment formula.',
  },
  discoveryFunnel: {
    ruleType: 'discovery_funnel',
    version: 'discovery-funnel-provisional-0.1.0',
    status: 'provisional',
    minimumHistoryDays: 20,
    config: {
      candidateLimit: 20,
      minimumTotalScore: 50,
      maximumRiskScore: 80,
      marketPassThreshold: 45,
      institutionPassThreshold: 45,
      technicalPassThreshold: 50,
    },
    changeNote:
      'Initial three-layer discovery funnel for staging validation; not a production investment formula.',
  },
} as const;

export const currentMarketScoreRule = scoreRuleRegistry.marketScore;
export const currentStockScoreRule = scoreRuleRegistry.stockScore;
export const currentDiscoveryFunnelRule = scoreRuleRegistry.discoveryFunnel;

export type ScoreRuleRegistryKey = keyof typeof scoreRuleRegistry;
