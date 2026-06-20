import { candidates, marketIndicators, reports } from '../data/mockData';
import { isLiveMode, supabase } from '../lib/supabase';
import type {
  AiCheckInput,
  AiCheckResult,
  AlertSummary,
  DashboardData,
  ReportSummary,
  StockWarRoomData,
  StockCandidate,
  WatchlistSummary,
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

export async function getStockWarRoom(symbol: string): Promise<StockWarRoomData> {
  if (isLiveMode) {
    return invoke<StockWarRoomData>('stock-war-room', { query: { symbol } });
  }
  await delay();
  const stock = candidates.find((item) => item.symbol === symbol) ?? candidates[0];
  return {
    symbol: stock.symbol,
    name: stock.name,
    industry: stock.industry,
    exchange: 'TWSE',
    score: stock.score,
    scoreChange: stock.change,
    signal: stock.signal,
    riskScore: stock.risk === '高' ? 74 : stock.risk === '中' ? 52 : 28,
    riskLabel: stock.risk,
    confidence: 65,
    grade: stock.score >= 85 ? 'A+' : stock.score >= 75 ? 'A' : 'B',
    dataAsOf: '2026-06-20T16:30:00+08:00',
    ruleVersion: 'demo-1.0.0',
    conclusion: {
      action: stock.score >= 80 ? '續抱 · 不追價' : '觀望 · 等待確認',
      summary:
        '趨勢與法人條件偏正向，但短線接近壓力區。既有部位可依支撐管理風險；新部位等待拉回或突破確認。',
    },
    dimensions: [
      { label: 'Market', value: 76, status: 'verified' },
      { label: 'Institution', value: 84, status: 'verified' },
      { label: 'Chip', value: 50, status: 'provisional' },
      { label: 'OI', value: 50, status: 'unavailable' },
      { label: 'Technical', value: 86, status: 'verified' },
    ],
    evidence: {
      institutional: ['近 5 日法人流向偏正向', '投信與外資方向需持續追蹤'],
      oi: ['個股 OI 尚未接入', '此構面暫不作積極判斷'],
      technical: ['價格位於 MA20 之上', '5 日報酬與成交量維持正向'],
      risk: ['短線波動風險中等', '跌破主要支撐需重新檢核'],
    },
    levels: { support: [960, 932], resistance: [1050, 1080] },
  };
}

export async function getWatchlistSummary(
  demoSymbols?: string[],
): Promise<WatchlistSummary> {
  if (isLiveMode) {
    return invoke<WatchlistSummary>('watchlist-summary');
  }
  await delay();
  const selected = demoSymbols?.length
    ? candidates.filter((stock) => demoSymbols.includes(stock.symbol))
    : candidates.slice(0, 3);
  const items = selected.map((stock) => ({
    ...stock,
    scoreChange: stock.change,
    summary:
      stock.change > 0
        ? '法人與技術分數同步改善，維持追蹤。'
        : '短線動能降溫，等待支撐確認。',
  }));
  return {
    id: null,
    items,
    risingCount: items.filter((item) => item.scoreChange > 0).length,
    alertCount: 1,
  };
}

export async function setWatchlistMembership(
  symbol: string,
  shouldWatch: boolean,
): Promise<void> {
  if (!isLiveMode || !supabase) return;

  const { data: stock, error: stockError } = await supabase
    .from('stocks')
    .select('id')
    .eq('symbol', symbol)
    .eq('is_active', true)
    .limit(1)
    .single();
  if (stockError) throw stockError;

  const { data: watchlist, error: watchlistError } = await supabase
    .from('watchlists')
    .select('id')
    .eq('is_default', true)
    .limit(1)
    .single();
  if (watchlistError) throw watchlistError;

  if (shouldWatch) {
    const { error } = await supabase
      .from('watchlist_items')
      .upsert(
        { watchlist_id: watchlist.id, stock_id: stock.id },
        { onConflict: 'watchlist_id,stock_id' },
      );
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('watchlist_items')
      .delete()
      .eq('watchlist_id', watchlist.id)
      .eq('stock_id', stock.id);
    if (error) throw error;
  }
}

export async function getAlerts(): Promise<AlertSummary[]> {
  if (!isLiveMode || !supabase) {
    await delay();
    return [
      {
        id: 'demo-risk-1',
        symbol: '2308',
        severity: 'warning',
        alertType: 'score_change',
        title: '台達電分數下降',
        message: 'JASIC Score 本期下降 5.6 分，請留意技術與法人訊號。',
        triggeredAt: '2026-06-20T16:35:00+08:00',
        readAt: null,
      },
    ];
  }

  const { data, error } = await supabase
    .from('alerts')
    .select('id, severity, alert_type, title, message, triggered_at, read_at, stocks(symbol)')
    .order('triggered_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    symbol: row.stocks?.symbol,
    severity: row.severity,
    alertType: row.alert_type,
    title: row.title,
    message: row.message,
    triggeredAt: row.triggered_at,
    readAt: row.read_at,
  }));
}

export async function markAlertRead(alertId: string): Promise<void> {
  if (!isLiveMode || !supabase) return;
  const { error } = await supabase
    .from('alerts')
    .update({ read_at: new Date().toISOString() })
    .eq('id', alertId);
  if (error) throw error;
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
