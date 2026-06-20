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

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('reports')
    .select('id, report_type, title, as_of, period_start, period_end, summary')
    .eq('status', 'published')
    .order('as_of', { ascending: false })
    .limit(20);

  if (error) {
    return jsonResponse(errorEnvelope('DATABASE_ERROR', error.message), 500);
  }

  const labels: Record<string, string> = {
    daily_market: 'Daily',
    weekly_core_pool: 'Weekly',
    stock_war_room: 'War Room',
    risk_alert: 'Risk',
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
        type: labels[report.report_type] ?? report.report_type,
        title: report.title,
        date: report.period_end ?? report.as_of.slice(0, 10),
        summary: report.summary,
      })),
    ),
  );
});
