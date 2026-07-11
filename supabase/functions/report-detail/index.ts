import { createServiceClient } from '../_shared/client.ts';
import { reportDisclaimer } from '../_shared/reports.ts';
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
  const rawQuery = request.headers.get('x-jasic-query');
  const query = rawQuery ? JSON.parse(rawQuery) as Record<string, string> : {};
  const reportId = query.reportId;
  if (!reportId) {
    return jsonResponse(errorEnvelope('INVALID_INPUT', 'reportId is required'), 400);
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
  const { data: report, error } = await supabase
    .from('reports')
    .select('id, report_type, title, as_of, period_start, period_end, summary, content, rule_version, user_id, stocks(symbol)')
    .eq('id', reportId)
    .eq('status', 'published')
    .or(`user_id.is.null,user_id.eq.${authData.user.id}`)
    .limit(1)
    .maybeSingle();
  if (error) {
    return jsonResponse(errorEnvelope('DATABASE_ERROR', error.message), 500);
  }
  if (!report) {
    return jsonResponse(errorEnvelope('REPORT_NOT_FOUND', 'Report not found'), 404);
  }

  const labels: Record<string, string> = {
    daily_market: 'Daily',
    weekly_core_pool: 'Weekly',
    stock_war_room: 'War Room',
    risk_alert: 'Risk',
  };
  const content = report.content as Record<string, any>;
  const governanceAudit =
    content?.governance_audit && typeof content.governance_audit === 'object'
      ? {
          modelIdentifier:
            typeof content.governance_audit.model_identifier === 'string'
              ? content.governance_audit.model_identifier
              : undefined,
          promptVersion:
            typeof content.governance_audit.prompt_version === 'string'
              ? content.governance_audit.prompt_version
              : undefined,
          responseSchemaVersion:
            typeof content.governance_audit.response_schema_version === 'string'
              ? content.governance_audit.response_schema_version
              : undefined,
          allowedActions: Array.isArray(content.governance_audit.allowed_actions)
            ? content.governance_audit.allowed_actions.filter((item: unknown) =>
                ['ADD', 'HOLD', 'WAIT', 'REDUCE', 'STOP_LOSS'].includes(String(item)),
              )
            : undefined,
        }
      : undefined;
  return jsonResponse(envelope({
    id: report.id,
    type: labels[report.report_type] ?? report.report_type,
    reportType: report.report_type,
    title: report.title,
    date: report.period_end ?? report.as_of.slice(0, 10),
    summary: report.summary,
    asOf: report.as_of,
    ruleVersion: report.rule_version,
    stockSymbol: (report as any).stocks?.symbol ?? content?.stock_symbol,
    governanceAudit,
    metrics: Array.isArray(content?.metrics) ? content.metrics : [],
    sections: Array.isArray(content?.sections) ? content.sections : [],
    disclaimer:
      typeof content?.disclaimer === 'string'
        ? content.disclaimer
        : reportDisclaimer(),
  }, {
    data_as_of: report.as_of,
    rule_version: report.rule_version,
  }));
});
