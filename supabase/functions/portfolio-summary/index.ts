import { createServiceClient } from '../_shared/client.ts';
import {
  envelope,
  errorEnvelope,
  jsonResponse,
  optionsResponse,
} from '../_shared/http.ts';
import { calculatePortfolioSummary } from '../_shared/portfolio.ts';

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
  const { data: authData, error: authError } = await supabase.auth.getUser(
    authHeader.replace(/^Bearer\s+/i, ''),
  );
  if (authError || !authData.user) {
    return jsonResponse(errorEnvelope('AUTH_REQUIRED', 'Invalid session'), 401);
  }

  const { data: positions, error: positionError } = await supabase
    .from('user_positions')
    .select(
      'id, stock_id, average_cost, quantity_shares, investment_horizon, note, updated_at, stocks!inner(symbol, name_zh, exchange)',
    )
    .eq('user_id', authData.user.id)
    .order('updated_at', { ascending: false });
  if (positionError) {
    return jsonResponse(
      errorEnvelope('DATABASE_ERROR', positionError.message),
      500,
    );
  }

  const enriched = await Promise.all(
    (positions ?? []).map(async (position: any) => {
      const [{ data: price }, { data: score }] = await Promise.all([
        supabase
          .from('stock_daily_prices')
          .select('close, trade_date')
          .eq('stock_id', position.stock_id)
          .order('trade_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('stock_score_snapshots')
          .select('total_score, risk_score, signal, as_of')
          .eq('stock_id', position.stock_id)
          .order('as_of', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      return {
        id: position.id,
        symbol: position.stocks.symbol,
        name: position.stocks.name_zh,
        exchange: position.stocks.exchange,
        averageCost: Number(position.average_cost),
        quantityShares: Number(position.quantity_shares),
        investmentHorizon: position.investment_horizon,
        note: position.note,
        updatedAt: position.updated_at,
        currentPrice: price ? Number(price.close) : null,
        priceAsOf: price?.trade_date ?? null,
        score: score ? Number(score.total_score) : null,
        riskScore: score ? Number(score.risk_score) : null,
        signal: score?.signal ?? null,
        scoreAsOf: score?.as_of ?? null,
      };
    }),
  );

  const summary = calculatePortfolioSummary(enriched);
  const latestPriceDate = enriched
    .map((position) => position.priceAsOf)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;

  return jsonResponse(
    envelope(
      {
        ...summary,
        valuationBasis: 'latest_available_eod_close',
        dataAsOf: latestPriceDate,
      },
      { data_as_of: latestPriceDate ?? undefined },
    ),
  );
});
