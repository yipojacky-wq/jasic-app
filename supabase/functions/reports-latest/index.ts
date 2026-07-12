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
  const { data, error } = await supabase
    .from('reports')
    .select('id, report_type, title, as_of, period_start, period_end, summary, user_id')
    .eq('status', 'published')
    .or(`user_id.is.null,user_id.eq.${authData.user.id}`)
    .order('as_of', { ascending: false })
    .limit(20);

  if (error) {
    return jsonResponse(errorEnvelope('DATABASE_ERROR', error.message), 500);
  }

  const labels: Record<string, string> = {
    daily_market: '每日市場',
    weekly_core_pool: '核心池週報',
    stock_war_room: '個股戰情',
    risk_alert: '風險警示',
  };

  const latestByType = new Map<string, any>();
  for (const report of data ?? []) {
    if (!latestByType.has(report.report_type)) {
      latestByType.set(report.report_type, report);
    }
  }

  return jsonResponse(
    envelope(
      [...latestByType.values()].map((report) => ({
        id: report.id,
        type: labels[report.report_type] ?? report.report_type,
        title: report.title,
        date: report.period_end ?? report.as_of.slice(0, 10),
        summary: report.summary,
      })),
    ),
  );
});
