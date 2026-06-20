import AsyncStorage from '@react-native-async-storage/async-storage';

import { candidates, marketIndicators, reports } from '../data/mockData';
import { lotsToShares } from '../lib/positions';
import { isLiveMode, supabase } from '../lib/supabase';
import { calculatePortfolioSummary } from '../../supabase/functions/_shared/portfolio.ts';
import { normalizeAlertThreshold } from '../../supabase/functions/_shared/alertRules.ts';
import type {
  AiCheckInput,
  AiCheckResult,
  AccountDeletionResult,
  AlertSummary,
  DashboardData,
  ReportSummary,
  ReportDetail,
  SettingsOverview,
  StockWarRoomData,
  StockCandidate,
  WatchlistSummary,
  UserProfile,
  UserDataExport,
  UserPosition,
  UserPositionInput,
  PortfolioSummary,
  AlertRule,
  AlertRuleUpdate,
  AiCheckHistoryItem,
  ReportBookmark,
} from '../types';

const delay = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms));
const demoReportBookmarksKey = 'jasic.demo.report-bookmarks';

let demoPositions: UserPosition[] = [
  {
    id: 'demo-position-2330',
    symbol: '2330',
    name: '台積電',
    exchange: 'TWSE',
    averageCost: 980,
    quantityShares: 1000,
    investmentHorizon: 'medium',
    note: '核心追蹤部位',
    updatedAt: '2026-06-20T16:30:00+08:00',
  },
];

let demoAlertRules: AlertRule[] = [
  {
    id: 'demo-rule-score',
    ruleType: 'score_change',
    threshold: 5,
    isEnabled: true,
    updatedAt: '2026-06-20T16:30:00+08:00',
  },
  {
    id: 'demo-rule-signal',
    ruleType: 'signal_change',
    threshold: null,
    isEnabled: true,
    updatedAt: '2026-06-20T16:30:00+08:00',
  },
  {
    id: 'demo-rule-risk',
    ruleType: 'risk_level',
    threshold: 70,
    isEnabled: true,
    updatedAt: '2026-06-20T16:30:00+08:00',
  },
];

let demoAiCheckHistory: AiCheckHistoryItem[] = [
  {
    id: 'demo-ai-history-1',
    symbol: '2330',
    name: '台積電',
    exchange: 'TWSE',
    cost: 980,
    quantityShares: 1000,
    investmentHorizon: '中期',
    riskProfile: 'balanced',
    requestedAt: '2026-06-20T16:30:00+08:00',
    action: 'HOLD',
    conclusion: '趨勢與法人條件仍具支撐，續抱但不追價。',
    reasons: ['JASIC Score 維持高檔', '市場環境中性偏多'],
    risks: ['短線漲幅擴大', '美債殖利率可能影響評價'],
    suggestions: ['依支撐管理風險', '訊號轉弱時重新檢核'],
    confidence: 82,
    modelIdentifier: 'demo-model',
    promptVersion: 'ai-check-1.0.0',
    ruleVersion: 'demo-1.0.0',
    createdAt: '2026-06-20T16:30:01+08:00',
  },
];

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
    confidence: 70,
    ruleVersion: 'stock-score-provisional-0.1.0',
    components: [
      { code: 'breadth', label: '市場廣度', value: 68, note: '站上 MA20 的股票占比' },
      { code: 'volatility', label: '平均波動', value: 18.6, note: '20 日平均波動率' },
      { code: 'confidence', label: '資料信心', value: 70, note: '資料完整度與驗證程度' },
    ],
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

export async function getReportDetail(reportId: string): Promise<ReportDetail> {
  if (isLiveMode) {
    return invoke<ReportDetail>('report-detail', { query: { reportId } });
  }
  await delay();
  const report = reports.find((item) => item.id === reportId) ?? reports[0];
  const reportType = {
    Daily: 'daily_market',
    Weekly: 'weekly_core_pool',
    'War Room': 'stock_war_room',
    Risk: 'risk_alert',
  }[report.type] as ReportDetail['reportType'];
  return {
    ...report,
    reportType,
    asOf: '2026-06-20T16:30:00+08:00',
    ruleVersion: 'demo-1.0.0',
    stockSymbol: report.type === 'War Room' ? '2330' : undefined,
    metrics:
      report.type === 'Daily'
        ? [
            { label: 'Market Score', value: '76' },
            { label: 'Risk Score', value: '42' },
            { label: '市場狀態', value: 'Neutral / Rotation' },
          ]
        : [
            { label: '追蹤標的', value: '20' },
            { label: '綠燈', value: '8' },
            { label: '高風險', value: '2' },
          ],
    sections: [
      {
        title: '核心結論',
        tone: 'info',
        items: [report.summary, '所有結論均需配合資料時間與個人風險承受度解讀。'],
      },
      {
        title: '主要證據',
        tone: 'positive',
        items: ['市場廣度維持正向', '法人與技術訊號在核心候選股中較為一致'],
      },
      {
        title: '風險提醒',
        tone: 'warning',
        items: ['利率與匯率變化可能提高波動', '暫定 Score 不包含完整個股 OI 與籌碼集中度'],
      },
    ],
    disclaimer: '本報告僅供研究與風險檢核，不構成獲利保證或自動交易指令。',
  };
}

export async function getReportBookmarks(): Promise<ReportBookmark[]> {
  if (!isLiveMode || !supabase) {
    const stored = await AsyncStorage.getItem(demoReportBookmarksKey);
    const ids = stored ? (JSON.parse(stored) as string[]) : [];
    return ids.map((reportId) => ({
      reportId,
      createdAt: new Date().toISOString(),
    }));
  }
  const { data, error } = await supabase
    .from('report_bookmarks')
    .select('report_id, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    reportId: row.report_id,
    createdAt: row.created_at,
  }));
}

export async function setReportBookmark(
  reportId: string,
  shouldBookmark: boolean,
): Promise<void> {
  if (!isLiveMode || !supabase) {
    const stored = await AsyncStorage.getItem(demoReportBookmarksKey);
    const ids = new Set<string>(stored ? JSON.parse(stored) : []);
    if (shouldBookmark) ids.add(reportId);
    else ids.delete(reportId);
    await AsyncStorage.setItem(
      demoReportBookmarksKey,
      JSON.stringify([...ids]),
    );
    return;
  }

  if (shouldBookmark) {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      throw userError ?? new Error('AUTH_REQUIRED');
    }
    const { error } = await supabase.from('report_bookmarks').upsert(
      {
        user_id: userData.user.id,
        report_id: reportId,
      },
      { onConflict: 'user_id,report_id' },
    );
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('report_bookmarks')
      .delete()
      .eq('report_id', reportId);
    if (error) throw error;
  }
}

export async function runAiCheck(input: AiCheckInput): Promise<AiCheckResult> {
  if (isLiveMode) {
    return invoke<AiCheckResult>('ai-check', { body: input });
  }
  const result = await runDemoAiCheck(input);
  const stock = candidates.find((item) => item.symbol === input.symbol);
  const createdAt = new Date().toISOString();
  demoAiCheckHistory = [
    {
      id: `demo-ai-history-${Date.now()}`,
      symbol: input.symbol,
      name: stock?.name ?? input.symbol,
      exchange: 'TWSE',
      cost: input.cost,
      quantityShares: input.lots * 1000,
      investmentHorizon: input.horizon,
      riskProfile: input.riskProfile,
      requestedAt: createdAt,
      ...result,
      modelIdentifier: 'demo-model',
      promptVersion: 'ai-check-1.0.0',
      ruleVersion: 'demo-1.0.0',
      createdAt,
    },
    ...demoAiCheckHistory,
  ].slice(0, 50);
  return result;
}

export async function getAiCheckHistory(): Promise<AiCheckHistoryItem[]> {
  if (isLiveMode) {
    return invoke<AiCheckHistoryItem[]>('ai-check-history', {
      query: { limit: '20' },
    });
  }
  await delay();
  return [...demoAiCheckHistory];
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

export async function getAlertRules(): Promise<AlertRule[]> {
  if (!isLiveMode || !supabase) {
    await delay();
    return [...demoAlertRules];
  }
  const { data, error } = await supabase
    .from('alert_rules')
    .select('id, rule_type, config, is_enabled, updated_at')
    .is('stock_id', null)
    .order('rule_type');
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    ruleType: row.rule_type,
    threshold:
      row.rule_type === 'signal_change'
        ? null
        : Number(row.config?.threshold),
    isEnabled: row.is_enabled,
    updatedAt: row.updated_at,
  }));
}

export async function updateAlertRule(
  input: AlertRuleUpdate,
): Promise<AlertRule> {
  const threshold =
    input.ruleType === 'signal_change'
      ? null
      : normalizeAlertThreshold(input.ruleType, input.threshold);
  const updatedAt = new Date().toISOString();

  if (!isLiveMode || !supabase) {
    await delay(220);
    const updated: AlertRule = {
      ...input,
      threshold,
      updatedAt,
    };
    demoAlertRules = demoAlertRules.map((rule) =>
      rule.id === input.id ? updated : rule,
    );
    return updated;
  }

  const { data, error } = await supabase
    .from('alert_rules')
    .update({
      config: threshold === null ? {} : { threshold },
      is_enabled: input.isEnabled,
      updated_at: updatedAt,
    })
    .eq('id', input.id)
    .select('id, rule_type, config, is_enabled, updated_at')
    .single();
  if (error) throw error;
  return {
    id: data.id,
    ruleType: data.rule_type,
    threshold:
      data.rule_type === 'signal_change'
        ? null
        : Number(data.config?.threshold),
    isEnabled: data.is_enabled,
    updatedAt: data.updated_at,
  };
}

export async function getUserPositions(): Promise<UserPosition[]> {
  if (!isLiveMode || !supabase) {
    await delay();
    return [...demoPositions];
  }

  const { data, error } = await supabase
    .from('user_positions')
    .select(
      'id, average_cost, quantity_shares, investment_horizon, note, updated_at, stocks!inner(symbol, name_zh, exchange)',
    )
    .order('updated_at', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    symbol: row.stocks.symbol,
    name: row.stocks.name_zh,
    exchange: row.stocks.exchange,
    averageCost: Number(row.average_cost),
    quantityShares: Number(row.quantity_shares),
    investmentHorizon: row.investment_horizon,
    note: row.note,
    updatedAt: row.updated_at,
  }));
}

export async function getPortfolioSummary(): Promise<PortfolioSummary> {
  if (isLiveMode) {
    return invoke<PortfolioSummary>('portfolio-summary');
  }
  await delay();
  const demoPrices: Record<
    string,
    { currentPrice: number; riskScore: number; score: number; signal: 'green' | 'yellow' | 'red' }
  > = {
    '2330': { currentPrice: 1040, riskScore: 38, score: 88, signal: 'green' },
    '2454': { currentPrice: 1285, riskScore: 48, score: 84, signal: 'green' },
    '2308': { currentPrice: 389, riskScore: 72, score: 78, signal: 'yellow' },
  };
  const calculated = calculatePortfolioSummary(
    demoPositions.map((position) => ({
      ...position,
      currentPrice: demoPrices[position.symbol]?.currentPrice ?? null,
      priceAsOf: '2026-06-20',
      score: demoPrices[position.symbol]?.score ?? null,
      riskScore: demoPrices[position.symbol]?.riskScore ?? null,
      signal: demoPrices[position.symbol]?.signal ?? null,
    })),
  );
  return {
    ...calculated,
    positions: calculated.positions as PortfolioSummary['positions'],
    valuationBasis: 'latest_available_eod_close',
    dataAsOf: '2026-06-20',
  };
}

export async function saveUserPosition(
  input: UserPositionInput,
): Promise<UserPosition> {
  const normalizedSymbol = input.symbol.trim();
  if (
    !/^\d{4}$/.test(normalizedSymbol) ||
    !Number.isFinite(input.averageCost) ||
    input.averageCost <= 0 ||
    !Number.isFinite(input.lots) ||
    input.lots <= 0
  ) {
    throw new Error('請輸入有效的四位股票代號、平均成本與張數。');
  }

  if (!isLiveMode || !supabase) {
    await delay(250);
    const stock = candidates.find((item) => item.symbol === normalizedSymbol);
    const position: UserPosition = {
      id: `demo-position-${normalizedSymbol}`,
      symbol: normalizedSymbol,
      name: stock?.name ?? normalizedSymbol,
      exchange: 'TWSE',
      averageCost: input.averageCost,
      quantityShares: lotsToShares(input.lots),
      investmentHorizon: input.investmentHorizon,
      note: input.note?.trim() || null,
      updatedAt: new Date().toISOString(),
    };
    demoPositions = [
      position,
      ...demoPositions.filter((item) => item.symbol !== normalizedSymbol),
    ];
    return position;
  }

  const [{ data: userData, error: userError }, { data: stock, error: stockError }] =
    await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from('stocks')
        .select('id, symbol, name_zh, exchange')
        .eq('symbol', normalizedSymbol)
        .eq('is_active', true)
        .limit(1)
        .single(),
    ]);
  if (userError || !userData.user) throw userError ?? new Error('AUTH_REQUIRED');
  if (stockError) throw new Error('查無此股票代號，請先確認市場資料已匯入。');

  const updatedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from('user_positions')
    .upsert(
      {
        user_id: userData.user.id,
        stock_id: stock.id,
        average_cost: input.averageCost,
        quantity_shares: lotsToShares(input.lots),
        investment_horizon: input.investmentHorizon,
        note: input.note?.trim() || null,
        updated_at: updatedAt,
      },
      { onConflict: 'user_id,stock_id' },
    )
    .select('id')
    .single();
  if (error) throw error;

  return {
    id: data.id,
    symbol: stock.symbol,
    name: stock.name_zh,
    exchange: stock.exchange,
    averageCost: input.averageCost,
    quantityShares: lotsToShares(input.lots),
    investmentHorizon: input.investmentHorizon,
    note: input.note?.trim() || null,
    updatedAt,
  };
}

export async function deleteUserPosition(positionId: string): Promise<void> {
  if (!isLiveMode || !supabase) {
    await delay(180);
    demoPositions = demoPositions.filter((item) => item.id !== positionId);
    return;
  }
  const { error } = await supabase
    .from('user_positions')
    .delete()
    .eq('id', positionId);
  if (error) throw error;
}

export async function getUserProfile(): Promise<UserProfile> {
  if (isLiveMode) {
    return invoke<UserProfile>('profile-settings', { body: { action: 'get' } });
  }
  await delay();
  return {
    id: null,
    email: 'demo@jasic.app',
    displayName: 'JASIC Alpha User',
    riskProfile: 'balanced',
    defaultHorizon: 'medium',
    timezone: 'Asia/Taipei',
    termsVersion: 'alpha-1.0',
    termsAcceptedAt: '2026-06-20T00:00:00+08:00',
  };
}

export async function updateUserProfile(input: {
  displayName: string;
  riskProfile: UserProfile['riskProfile'];
  defaultHorizon: UserProfile['defaultHorizon'];
  acceptTerms?: boolean;
}): Promise<UserProfile> {
  if (isLiveMode) {
    return invoke<UserProfile>('profile-settings', {
      body: { action: 'update', ...input },
    });
  }
  await delay(300);
  return {
    id: null,
    email: 'demo@jasic.app',
    displayName: input.displayName,
    riskProfile: input.riskProfile,
    defaultHorizon: input.defaultHorizon,
    timezone: 'Asia/Taipei',
    termsVersion: input.acceptTerms ? 'alpha-1.0' : null,
    termsAcceptedAt: input.acceptTerms
      ? new Date().toISOString()
      : null,
  };
}

export async function getSettingsOverview(): Promise<SettingsOverview> {
  const profile = await getUserProfile();
  if (isLiveMode) {
    const governance = await invoke<Omit<SettingsOverview, 'profile'>>('data-health');
    return { profile, ...governance };
  }
  await delay();
  return {
    profile,
    dataHealth: [
      {
        code: 'TWSE_STOCK_DAY_ALL',
        label: '上市個股日成交資訊',
        status: 'healthy',
        provider: 'Taiwan Stock Exchange',
        frequency: 'trading_day_eod',
        runStatus: 'completed',
        dataAsOf: '2026-06-18',
        lastRunAt: '2026-06-18T18:05:00+08:00',
        records: 1050,
        recordsReceived: 1050,
        recordsRejected: 0,
        qualityRate: 100,
        message: '展示資料模式',
      },
      {
        code: 'TPEX_DAILY_QUOTES',
        label: '上櫃股票每日收盤行情',
        status: 'healthy',
        provider: 'Taipei Exchange',
        frequency: 'trading_day_eod',
        runStatus: 'completed',
        dataAsOf: '2026-06-18',
        lastRunAt: '2026-06-18T18:08:00+08:00',
        records: 820,
        recordsReceived: 823,
        recordsRejected: 3,
        qualityRate: 99.64,
        message: '展示資料模式',
      },
      {
        code: 'TWSE_T86',
        label: '上市三大法人買賣超',
        status: 'warning',
        provider: 'Taiwan Stock Exchange',
        frequency: 'trading_day_eod',
        runStatus: 'partial',
        dataAsOf: '2026-06-18',
        lastRunAt: '2026-06-18T18:12:00+08:00',
        records: 1028,
        recordsReceived: 1050,
        recordsRejected: 22,
        qualityRate: 97.9,
        message: '部分股票代號未通過 MVP 股票範圍規則',
        action: '檢查拒絕清單，確認 ETF、權證等非普通股已被正確排除。',
      },
      {
        code: 'MARKET_SCORE',
        label: 'Market / Stock Score',
        status: 'warning',
        provider: 'JASIC Score Engine',
        frequency: 'derived',
        runStatus: 'completed',
        dataAsOf: '2026-06-20T16:30:00+08:00',
        lastRunAt: '2026-06-20T16:31:00+08:00',
        message: '目前使用展示與暫定規則資料',
      },
      {
        code: 'TREND_REPORTS',
        label: '四種趨勢報告',
        status: 'healthy',
        provider: 'JASIC Report Engine',
        frequency: 'derived',
        runStatus: 'completed',
        dataAsOf: '2026-06-20T16:35:00+08:00',
        lastRunAt: '2026-06-20T16:36:00+08:00',
        message: '展示報告已依最新分數完成',
      },
    ],
    methodology: {
      scoreRuleVersion: 'stock-score-provisional-0.1.0',
      scoreRuleStatus: 'provisional',
      scoreRuleNote: '工程驗證規則，等待 JASIC 正式權重與校準案例簽核。',
      sources: [
        {
          code: 'TWSE_STOCK_DAY_ALL',
          provider: 'Taiwan Stock Exchange',
          datasetName: '上市個股日成交資訊',
          frequency: 'trading_day_eod',
          attribution: '資料來源：臺灣證券交易所 OpenAPI',
        },
        {
          code: 'TPEX_DAILY_QUOTES',
          provider: 'Taipei Exchange',
          datasetName: '上櫃股票每日收盤行情',
          frequency: 'trading_day_eod',
          attribution: '資料來源：證券櫃檯買賣中心 OpenAPI',
        },
      ],
    },
  };
}

export async function exportUserData(): Promise<UserDataExport> {
  if (isLiveMode) {
    return invoke<UserDataExport>('user-data-export');
  }
  await delay(350);
  const profile = await getUserProfile();
  return {
    schemaVersion: 'jasic-user-export-1.0',
    exportedAt: new Date().toISOString(),
    profile,
    watchlists: [{ name: '我的觀察清單', symbols: ['2330', '2454', '2308'] }],
    positions: [],
    aiChecks: [],
    alerts: [],
    alertRules: [],
    personalReports: [],
    reportBookmarks: [],
  };
}

export async function deleteAccount(
  confirmation: string,
): Promise<AccountDeletionResult> {
  if (!isLiveMode) {
    throw new Error('展示模式不會刪除任何帳號。');
  }
  return invoke<AccountDeletionResult>('account-delete', {
    body: { confirmation },
  });
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
