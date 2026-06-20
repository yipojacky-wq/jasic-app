export type TabKey =
  | 'dashboard'
  | 'discovery'
  | 'watchlist'
  | 'reports'
  | 'ai-check'
  | 'settings';

export type Signal = 'green' | 'yellow' | 'red';
export type AiAction = 'ADD' | 'HOLD' | 'WAIT' | 'REDUCE' | 'STOP_LOSS';

export interface StockCandidate {
  symbol: string;
  name: string;
  industry: string;
  score: number;
  change: number;
  signal: Signal;
  category: string;
  risk: '低' | '中' | '高';
}

export interface MarketIndicator {
  label: string;
  value: string;
  trend: string;
  state: 'positive' | 'neutral' | 'negative';
}

export interface DashboardData {
  marketScore: number;
  riskScore: number;
  regime: string;
  signal: Signal;
  indicators: MarketIndicator[];
  summary: string;
  dataAsOf?: string;
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

export interface UserProfile {
  id: string | null;
  email: string;
  displayName: string;
  riskProfile: 'conservative' | 'balanced' | 'aggressive' | 'growth';
  defaultHorizon: 'short' | 'swing' | 'medium' | 'long';
  timezone: string;
  termsVersion?: string | null;
  termsAcceptedAt?: string | null;
}

export interface DataHealthItem {
  code: string;
  label: string;
  status: 'healthy' | 'warning' | 'stale' | 'missing';
  dataAsOf?: string | null;
  lastRunAt?: string | null;
  records?: number;
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
