import { normalizeAiHistoryResult } from '../_shared/aiHistory.ts';
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
  const { data: authData, error: authError } = await supabase.auth.getUser(
    authHeader.replace(/^Bearer\s+/i, ''),
  );
  if (authError || !authData.user) {
    return jsonResponse(errorEnvelope('AUTH_REQUIRED', 'Invalid session'), 401);
  }

  const rawQuery = request.headers.get('x-jasic-query');
  const query = rawQuery
    ? (JSON.parse(rawQuery) as Record<string, string>)
    : {};
  const requestedLimit = Number(query.limit ?? 20);
  const limit = Math.min(50, Math.max(1, Math.floor(requestedLimit) || 20));

  const { data: requests, error } = await supabase
    .from('ai_check_requests')
    .select(
        'id, cost, quantity_shares, investment_horizon, risk_profile, status, created_at, stocks!inner(symbol, name_zh, exchange), ai_check_results(action, conclusion, reasons, risks, suggestions, confidence, model_identifier, prompt_version, response_schema_version, rule_version, allowed_actions, created_at)',
    )
    .eq('user_id', authData.user.id)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    return jsonResponse(errorEnvelope('DATABASE_ERROR', error.message), 500);
  }

  const history = (requests ?? [])
    .map((row: any) => {
      const result = normalizeAiHistoryResult(row.ai_check_results);
      if (!result) return null;
      return {
        id: row.id,
        symbol: row.stocks.symbol,
        name: row.stocks.name_zh,
        exchange: row.stocks.exchange,
        cost: Number(row.cost),
        quantityShares: Number(row.quantity_shares),
        investmentHorizon: row.investment_horizon,
        riskProfile: row.risk_profile,
        requestedAt: row.created_at,
        ...result,
      };
    })
    .filter(Boolean);

  return jsonResponse(envelope(history));
});
