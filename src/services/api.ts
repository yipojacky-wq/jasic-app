import { candidates, marketIndicators, reports } from '../data/mockData';
import { isLiveMode, supabase } from '../lib/supabase';
import type {
  AiCheckInput,
  AiCheckResult,
  DashboardData,
  ReportSummary,
  StockCandidate,
} from '../types';

const delay = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms));

type ApiEnvelope<T> = {
  data: T;
  meta?: {
    data_as_of?: string;
    request_id?: string;
    rule_version?: string;
  };
  error?: { code: string; message: string } | null;
};

async function invoke<T>(
  functionName: string,
  options?: { body?: unknown; query?: Record<string, string> },
): Promise<T> {
  if (!supabase || !isLiveMode) {
    throw new Error('LIVE_API_NOT_CONFIGURED');
  }

  const { data, error } = await supabase.functions.invoke<ApiEnvelope<T>>(functionName, {
    body: options?.body as Record<string, unknown> | undefined,
    headers: options?.query
      ? { 'x-jasic-query': JSON.stringify(options.query) }
      : undefined,
  });

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.error) {
    throw new Error(data?.error?.message ?? 'EMPTY_API_RESPONSE');
  }
  return data.data;
}

export async function getDashboard(): Promise<DashboardData> {
  if (isLiveMode) {
    return invoke<DashboardData>('market-summary');
  }
  await delay();
  return {
    marketScore: 76,
    riskScore: 42,
    regime: 'Neutral / Rotation',
    signal: 'green',
    indicators: marketIndicators,
    summary:
      '市場維持中性偏多，但資金成本與波動指標出現分歧。策略宜聚焦強勢產業、避免追高，保留部分現金等待確認。',
    dataAsOf: '2026-06-20T16:30:00+08:00',
  };
}

export async function getCandidates(): Promise<StockCandidate[]> {
  if (isLiveMode) {
    return invoke<StockCandidate[]>('discovery-latest', {
      query: { limit: '20' },
    });
  }
  await delay();
  return candidates;
}

export async function getReports(): Promise<ReportSummary[]> {
  if (isLiveMode) {
    return invoke<ReportSummary[]>('reports-latest');
  }
  await delay();
  return reports;
}

export async function runAiCheck(input: AiCheckInput): Promise<AiCheckResult> {
  if (isLiveMode) {
    return invoke<AiCheckResult>('ai-check', { body: input });
  }
  return runDemoAiCheck(input);
}

async function runDemoAiCheck(input: AiCheckInput): Promise<AiCheckResult> {
  await delay(650);
  const stock = candidates.find((item) => item.symbol === input.symbol);
  const score = stock?.score ?? 62;

  if (score >= 82 && input.riskProfile !== 'conservative') {
    return {
      action: 'HOLD',
      conclusion: `${input.symbol} 目前趨勢與籌碼條件仍具支撐，建議續抱並等待下一個確認訊號。`,
      reasons: ['JASIC Score 維持 80 分以上', '市場環境中性偏多', '法人與技術訊號方向一致'],
      risks: ['美債殖利率回升可能壓抑評價', '短線漲幅擴大，追價風險提高'],
      suggestions: ['以既定停損或風險預算管理部位', '若跌破主要支撐，重新執行 AI Check'],
      confidence: 82,
    };
  }

  return {
    action: 'WAIT',
    conclusion: `${input.symbol} 現階段訊號不足，建議觀望，不因單一價格波動做出決策。`,
    reasons: ['綜合分數尚未進入積極區間', '市場與個股訊號仍有分歧'],
    risks: ['資料完整度或 OI 覆蓋可能不足', '震盪環境容易出現假突破'],
    suggestions: ['等待法人與技術訊號同步', '先設定可承受損失，再決定是否建立部位'],
    confidence: 68,
  };
}
