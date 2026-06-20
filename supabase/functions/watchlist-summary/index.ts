import { createServiceClient } from '../_shared/client.ts';
import {
  envelope,
  errorEnvelope,
  jsonResponse,
  optionsResponse,
} from '../_shared/http.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') {
    return jsonResponse(errorEnvelope('METHOD_NOT_ALLOWED', 'POST required'), 405);
  }
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse(errorEnvelope('AUTH_REQUIRED', 'Missing authorization'), 401);
  }

  const supabase = createServiceClient();
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  const { data: authData, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !authData.user) {
    return jsonResponse(errorEnvelope('AUTH_REQUIRED', 'Invalid session'), 401);
  }

  const { data: watchlist, error: watchlistError } = await supabase
    .from('watchlists')
    .select('id')
    .eq('user_id', authData.user.id)
    .eq('is_default', true)
    .limit(1)
    .maybeSingle();
  if (watchlistError) {
    return jsonResponse(errorEnvelope('DATABASE_ERROR', watchlistError.message), 500);
  }
  if (!watchlist) {
    return jsonResponse(envelope({ id: null, items: [], risingCount: 0, alertCount: 0 }));
  }

  const { data: entries, error: entryError } = await supabase
    .from('watchlist_items')
    .select('stock_id, stocks!inner(symbol, name_zh, industry_code)')
    .eq('watchlist_id', watchlist.id);
  if (entryError) {
    return jsonResponse(errorEnvelope('DATABASE_ERROR', entryError.message), 500);
  }

  const items = await Promise.all((entries ?? []).map(async (entry: any) => {
    const { data: scores } = await supabase
      .from('stock_score_snapshots')
      .select('total_score, risk_score, signal, as_of')
      .eq('stock_id', entry.stock_id)
      .order('as_of', { ascending: false })
      .limit(2);
    const current = scores?.[0];
    const previous = scores?.[1];
    const score = Number(current?.total_score ?? 0);
    const scoreChange = previous
      ? score - Number(previous.total_score)
      : 0;
    const riskScore = Number(current?.risk_score ?? 50);
    return {
      symbol: entry.stocks.symbol,
      name: entry.stocks.name_zh,
      industry: entry.stocks.industry_code ?? '未分類',
      score,
      change: Math.round(scoreChange * 100) / 100,
      scoreChange: Math.round(scoreChange * 100) / 100,
      signal: current?.signal ?? 'yellow',
      category: 'watchlist',
      risk: riskScore >= 70 ? '高' : riskScore >= 40 ? '中' : '低',
      summary:
        scoreChange > 0
          ? '綜合分數改善，維持追蹤並檢查風險。'
          : scoreChange < 0
            ? '綜合分數下降，留意燈號與支撐變化。'
            : '分數暫無明顯變化。',
      dataAsOf: current?.as_of,
    };
  }));

  const { count: alertCount } = await supabase
    .from('alerts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', authData.user.id)
    .is('read_at', null);

  return jsonResponse(envelope({
    id: watchlist.id,
    items,
    risingCount: items.filter((item) => item.scoreChange > 0).length,
    alertCount: alertCount ?? 0,
  }));
});
