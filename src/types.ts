export type TabKey =
  | 'dashboard'
  | 'discovery'
  | 'watchlist'
  | 'reports'
  | 'ai-check'
  | 'settings';

export type Signal = 'green' | 'yellow' | 'red';
export type AiAction = 'ADD' | 'HOLD' | 'WAIT' | 'REDUCE' | 'STOP_LOSS';
export type InvestmentHorizon = 'short' | 'swing' | 'medium' | 'long';

export interface StockCandidate {
  rank?: number;
  symbol: string;
  name: string;
  industry: string;
  score: number;
  change: number;
  signal: Signal;
  category: string;
  risk: '低' | '中' | '高';
  confidence?: number;
  layerResults?: {
    market: {
      status: 'pass' | 'caution' | 'reject';
      score?: number;
    };
    institution: {
      status: 'pass' | 'caution' | 'reject';
      score?: number;
    };
    technicalRisk: {
      status: 'pass' | 'caution' | 'reject';
      technicalScore?: number;
      riskScore?: number;
    };
  };
  rankReasons?: string[];
  riskFlags?: string[];
  dataAsOf?: string;
  ruleVersion?: string;
}

export interface MarketIndicator {
  code: string;
  label: string;
  value: string;
  trend: string;
  state: 'positive' | 'neutral' | 'negative';
  unit: string;
  frequency: string;
  sourceName: string;
  observationDate?: string | null;
  releasedAt?: string | null;
  freshness: 'fresh' | 'warning' | 'stale' | 'missing';
  ageDays?: number | null;
  impact: string;
  history: Array<{
    date: string;
    value: number;
    displayValue: string;
  }>;
}

export interface DashboardData {
  marketScore: number;
  riskScore: number;
  regime: string;
  signal: Signal;
  indicators: MarketIndicator[];
  summary: string;
  dataAsOf?: string;
  confidence: number;
  ruleVersion: string;
  components: Array<{
    code: string;
    label: string;
    value: number;
    note: string;
  }>;
}

export interface ReportSummary {
  id: string;
  type: string;
  title: string;
  date: string;
  summary: string;
}

export interface ReportSection {
  title: string;
  items: string[];
  tone?: 'info' | 'positive' | 'warning' | 'danger';
}

export interface ReportMetric {
  label: string;
  value: string;
  note?: string;
}

export interface ReportDetail extends ReportSummary {
  reportType: 'daily_market' | 'weekly_core_pool' | 'stock_war_room' | 'risk_alert';
  asOf: string;
  ruleVersion: string;
  stockSymbol?: string;
  metrics: ReportMetric[];
  sections: ReportSection[];
  disclaimer: string;
}

export interface ReportBookmark {
  reportId: string;
  createdAt: string;
}

export interface AiCheckInput {
  symbol: string;
  cost: number;
  lots: number;
  horizon: string;
  riskProfile: string;
}

export interface AiCheckResult {
  action: AiAction;
  conclusion: string;
  reasons: string[];
  risks: string[];
  suggestions: string[];
  confidence: number;
}

export interface AiCheckHistoryItem extends AiCheckResult {
  id: string;
  symbol: string;
  name: string;
  exchange: string;
  cost: number;
  quantityShares: number;
  investmentHorizon: string;
  riskProfile: string;
  requestedAt: string;
  modelIdentifier: string;
  promptVersion: string;
  ruleVersion: string;
  createdAt: string;
}

export interface ScoreDimension {
  label: 'Market' | 'Institution' | 'Chip' | 'OI' | 'Technical';
  value: number;
  status: 'verified' | 'provisional' | 'unavailable';
}

export interface StockWarRoomData {
  symbol: string;
  name: string;
  industry: string;
  exchange: string;
  score: number;
  scoreChange: number;
  signal: Signal;
  riskScore: number;
  riskLabel: '低' | '中' | '高';
  confidence: number;
  grade: string;
  dataAsOf: string;
  ruleVersion: string;
  conclusion: {
    action: string;
    summary: string;
  };
  dimensions: ScoreDimension[];
  evidence: {
    institutional: string[];
    oi: string[];
    technical: string[];
    risk: string[];
  };
  levels: {
    support: number[];
    resistance: number[];
  };
}

export interface WatchlistItemSummary extends StockCandidate {
  scoreChange: number;
  summary: string;
  dataAsOf?: string;
}

export interface WatchlistSummary {
  id: string | null;
  items: WatchlistItemSummary[];
  risingCount: number;
  alertCount: number;
}

export interface AlertSummary {
  id: string;
  symbol?: string;
  severity: 'info' | 'warning' | 'critical';
  alertType: string;
  title: string;
  message: string;
  triggeredAt: string;
  readAt?: string | null;
}

export type AlertRuleType = 'score_change' | 'signal_change' | 'risk_level';

export interface AlertRule {
  id: string;
  ruleType: AlertRuleType;
  threshold?: number | null;
  isEnabled: boolean;
  updatedAt: string;
}

export interface AlertRuleUpdate {
  id: string;
  ruleType: AlertRuleType;
  threshold?: number | null;
  isEnabled: boolean;
}

export interface UserProfile {
  id: string | null;
  email: string;
  displayName: string;
  riskProfile: 'conservative' | 'balanced' | 'aggressive' | 'growth';
  defaultHorizon: InvestmentHorizon;
  timezone: string;
  termsVersion?: string | null;
  termsAcceptedAt?: string | null;
}

export interface UserPosition {
  id: string;
  symbol: string;
  name: string;
  exchange: string;
  averageCost: number;
  quantityShares: number;
  investmentHorizon: InvestmentHorizon;
  note?: string | null;
  updatedAt: string;
}

export interface UserPositionInput {
  symbol: string;
  averageCost: number;
  lots: number;
  investmentHorizon: InvestmentHorizon;
  note?: string;
}

export interface PortfolioPosition extends UserPosition {
  currentPrice?: number | null;
  priceAsOf?: string | null;
  score?: number | null;
  riskScore?: number | null;
  signal?: Signal | null;
  costBasis: number;
  marketValue?: number | null;
  unrealizedPnl?: number | null;
  returnPct?: number | null;
  concentrationPct: number;
  riskLabel: '低' | '中' | '高';
}

export interface PortfolioSummary {
  totalCostBasis: number;
  totalMarketValue: number;
  totalUnrealizedPnl: number;
  totalReturnPct: number;
  weightedRiskScore: number;
  highRiskCount: number;
  missingPriceCount: number;
  largestPositionSymbol?: string | null;
  largestConcentrationPct: number;
  alerts: string[];
  positions: PortfolioPosition[];
  valuationBasis: 'latest_available_eod_close';
  dataAsOf?: string | null;
}

export interface DataHealthItem {
  code: string;
  label: string;
  status: 'healthy' | 'warning' | 'stale' | 'missing';
  provider?: string;
  frequency?: string;
  runStatus?: 'running' | 'completed' | 'failed' | 'partial' | null;
  dataAsOf?: string | null;
  lastRunAt?: string | null;
  records?: number;
  recordsReceived?: number;
  recordsRejected?: number;
  qualityRate?: number | null;
  errorSummary?: string | null;
  action?: string;
  message: string;
}

export interface MethodologyInfo {
  scoreRuleVersion: string;
  scoreRuleStatus: string;
  scoreRuleNote: string;
  sources: Array<{
    code: string;
    provider: string;
    datasetName: string;
    frequency: string;
    attribution?: string | null;
  }>;
}

export interface SettingsOverview {
  profile: UserProfile;
  dataHealth: DataHealthItem[];
  methodology: MethodologyInfo;
}

export interface UserDataExport {
  schemaVersion: string;
  exportedAt: string;
  profile: UserProfile;
  watchlists: unknown[];
  positions: unknown[];
  aiChecks: unknown[];
  alerts: unknown[];
  alertRules: unknown[];
  personalReports: unknown[];
  reportBookmarks: unknown[];
}

export interface AccountDeletionResult {
  deleted: boolean;
  requestId: string;
  completedAt: string;
}
