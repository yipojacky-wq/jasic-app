import { createServiceClient } from '../_shared/client.ts';
import {
  envelope,
  errorEnvelope,
  jsonResponse,
  optionsResponse,
} from '../_shared/http.ts';
import { deriveLevels, warRoomConclusion } from '../_shared/warRoom.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') {
    return jsonResponse(errorEnvelope('METHOD_NOT_ALLOWED', 'POST required'), 405);
  }

  const rawQuery = request.headers.get('x-jasic-query');
  const query = rawQuery ? JSON.parse(rawQuery) as Record<string, string> : {};
  const symbol = query.symbol?.trim();
  if (!symbol) {
    return jsonResponse(errorEnvelope('INVALID_INPUT', 'symbol is required'), 400);
  }

  const supabase = createServiceClient();
  const { data: stock, error: stockError } = await supabase
    .from('stocks')
    .select('id, symbol, exchange, name_zh, industry_code')
    .eq('symbol', symbol)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (stockError) {
    return jsonResponse(errorEnvelope('DATABASE_ERROR', stockError.message), 500);
  }
  if (!stock) {
    return jsonResponse(errorEnvelope('STOCK_NOT_FOUND', 'Unknown stock symbol'), 404);
  }

  const [
    { data: scores, error: scoreError },
    { data: prices, error: priceError },
    { data: features, error: featureError },
    { data: flows, error: flowError },
  ] = await Promise.all([
    supabase
      .from('stock_score_snapshots')
      .select('*')
      .eq('stock_id', stock.id)
      .order('as_of', { ascending: false })
      .limit(2),
    supabase
      .from('stock_daily_prices')
      .select('trade_date, open, high, low, close, volume')
      .eq('stock_id', stock.id)
      .order('trade_date', { ascending: false })
      .limit(60),
    supabase
      .from('stock_features_daily')
      .select('*')
      .eq('stock_id', stock.id)
      .order('trade_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('institutional_flows_daily')
      .select('trade_date, foreign_net, investment_trust_net, dealer_net, total_net')
      .eq('stock_id', stock.id)
      .order('trade_date', { ascending: false })
      .limit(5),
  ]);

  const databaseError = scoreError ?? priceError ?? featureError ?? flowError;
  if (databaseError) {
    return jsonResponse(errorEnvelope('DATABASE_ERROR', databaseError.message), 500);
  }
  const current = scores?.[0];
  if (!current) {
    return jsonResponse(errorEnvelope('INSUFFICIENT_DATA', 'No score snapshot'), 503);
  }

  const previous = scores?.[1];
  const scoreChange = previous
    ? Number(current.total_score) - Number(previous.total_score)
    : 0;
  const riskScore = Number(current.risk_score);
  const confidence = Number(current.confidence_score);
  const riskLabel = riskScore >= 70 ? '高' : riskScore >= 40 ? '中' : '低';
  const levels = deriveLevels(prices ?? []);
  const flowTotal = (flows ?? []).reduce(
    (sum: number, flow: any) => sum + Number(flow.total_net ?? 0),
    0,
  );
  const latestPrice = prices?.[0];
  const evidence = current.evidence as Record<string, any>;
  const missingDimensions = Array.isArray(evidence?.missing_dimensions)
    ? evidence.missing_dimensions
    : [];

  const conclusion = warRoomConclusion(
    Number(current.total_score),
    riskScore,
    confidence,
  );
  const grade =
    Number(current.total_score) >= 90
      ? 'A+'
      : Number(current.total_score) >= 80
        ? 'A'
        : Number(current.total_score) >= 70
          ? 'B'
          : Number(current.total_score) >= 55
            ? 'C'
            : 'D';

  const data = {
    symbol: stock.symbol,
    name: stock.name_zh,
    industry: stock.industry_code ?? '未分類',
    exchange: stock.exchange,
    score: Number(current.total_score),
    scoreChange: Math.round(scoreChange * 100) / 100,
    signal: current.signal,
    riskScore,
    riskLabel,
    confidence,
    grade,
    dataAsOf: current.as_of,
    ruleVersion: current.rule_version,
    conclusion,
    dimensions: [
      { label: 'Market', value: Number(current.market_score), status: 'verified' },
      { label: 'Institution', value: Number(current.institution_score), status: 'verified' },
      {
        label: 'Chip',
        value: Number(current.chip_score),
        status: missingDimensions.includes('verified_chip_concentration')
          ? 'provisional'
          : 'verified',
      },
      {
        label: 'OI',
        value: Number(current.oi_score),
        status: missingDimensions.includes('individual_stock_oi')
          ? 'unavailable'
          : 'verified',
      },
      { label: 'Technical', value: Number(current.technical_score), status: 'verified' },
    ],
    evidence: {
      institutional: [
        flowTotal > 0
          ? `近 5 日三大法人合計買超 ${formatShares(flowTotal)} 股`
          : flowTotal < 0
            ? `近 5 日三大法人合計賣超 ${formatShares(Math.abs(flowTotal))} 股`
            : '近 5 日法人流向中性或資料不足',
        `法人分數 ${Number(current.institution_score).toFixed(1)}`,
      ],
      oi: missingDimensions.includes('individual_stock_oi')
        ? ['個股 OI 尚未接入', '此構面維持中性，不作積極判斷']
        : [`OI 分數 ${Number(current.oi_score).toFixed(1)}`],
      technical: [
        latestPrice && features
          ? `收盤 ${Number(latestPrice.close).toFixed(2)}，MA20 ${Number(features.ma20).toFixed(2)}`
          : '技術資料不足',
        `5 日報酬 ${formatPercent(Number(features?.return_5d ?? 0))}`,
        `20 日量比 ${Number(features?.volume_ratio_20d ?? 0).toFixed(2)}`,
      ],
      risk: [
        `風險分數 ${riskScore.toFixed(1)}，${riskLabel}風險`,
        confidence < 70
          ? '部分構面未驗證，信心分數已下調'
          : '資料完整度達可研究門檻',
      ],
    },
    levels,
  };

  return jsonResponse(
    envelope(data, {
      data_as_of: current.as_of,
      rule_version: current.rule_version,
    }),
  );
});

function formatShares(value: number) {
  return Math.round(value).toLocaleString('en-US');
}

function formatPercent(value: number) {
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;
}
