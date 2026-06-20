export type TabKey =
  | 'dashboard'
  | 'discovery'
  | 'watchlist'
  | 'reports'
  | 'ai-check';

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
  type: string;
  title: string;
  date: string;
  summary: string;
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
