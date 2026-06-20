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
  const userId = authData.user.id;

  const [
    { data: profile, error: profileError },
    { data: watchlists, error: watchlistError },
    { data: positions, error: positionError },
    { data: aiRequests, error: aiRequestError },
    { data: alerts, error: alertsError },
    { data: alertRules, error: rulesError },
    { data: personalReports, error: reportsError },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, display_name, risk_profile, default_horizon, timezone, terms_version, terms_accepted_at, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('watchlists')
      .select('id, name, is_default, created_at, watchlist_items(created_at, note, stocks(symbol, exchange, name_zh, industry_code))')
      .eq('user_id', userId),
    tableExistsQuery(supabase, 'user_positions', userId),
    supabase
      .from('ai_check_requests')
      .select('id, cost, quantity_shares, investment_horizon, risk_profile, status, created_at, stocks(symbol, exchange, name_zh), ai_check_results(action, conclusion, reasons, risks, suggestions, confidence, model_identifier, prompt_version, rule_version, created_at)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('alerts')
      .select('severity, alert_type, title, message, evidence, triggered_at, read_at, stocks(symbol, name_zh)')
      .eq('user_id', userId)
      .order('triggered_at', { ascending: false }),
    supabase
      .from('alert_rules')
      .select('rule_type, config, is_enabled, created_at, updated_at, stocks(symbol, name_zh)')
      .eq('user_id', userId),
    supabase
      .from('reports')
      .select('report_type, title, period_start, period_end, as_of, summary, content, rule_version, published_at, stocks(symbol, name_zh)')
      .eq('user_id', userId)
      .order('as_of', { ascending: false }),
  ]);

  const queryError =
    profileError ??
    watchlistError ??
    positionError ??
    aiRequestError ??
    alertsError ??
    rulesError ??
    reportsError;
  if (queryError) {
    return jsonResponse(errorEnvelope('DATABASE_ERROR', queryError.message), 500);
  }

  return jsonResponse(envelope({
    schemaVersion: 'jasic-user-export-1.0',
    exportedAt: new Date().toISOString(),
    profile: {
      id: profile?.id ?? userId,
      email: authData.user.email ?? '',
      displayName: profile?.display_name ?? '',
      riskProfile: profile?.risk_profile ?? 'balanced',
      defaultHorizon: profile?.default_horizon ?? 'medium',
      timezone: profile?.timezone ?? 'Asia/Taipei',
      termsVersion: profile?.terms_version,
      termsAcceptedAt: profile?.terms_accepted_at,
      createdAt: profile?.created_at,
      updatedAt: profile?.updated_at,
    },
    watchlists: watchlists ?? [],
    positions: positions ?? [],
    aiChecks: aiRequests ?? [],
    alerts: alerts ?? [],
    alertRules: alertRules ?? [],
    personalReports: personalReports ?? [],
  }));
});

async function tableExistsQuery(supabase: any, table: string, userId: string) {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('user_id', userId);
  // user_positions is a Phase 1.1 table and may not exist yet.
  if (error?.code === '42P01' || error?.code === 'PGRST205') {
    return { data: [], error: null };
  }
  return { data, error };
}
