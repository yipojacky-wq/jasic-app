import { createServiceClient } from '../_shared/client.ts';
import { requireCronSecret } from '../_shared/data.ts';
import {
  envelope,
  errorEnvelope,
  jsonResponse,
  optionsResponse,
} from '../_shared/http.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return optionsResponse();
  const forbidden = requireCronSecret(request);
  if (forbidden) return forbidden;
  if (request.method !== 'POST') {
    return jsonResponse(errorEnvelope('METHOD_NOT_ALLOWED', 'POST required'), 405);
  }

  const supabase = createServiceClient();
  try {
    const { data: entries, error: entryError } = await supabase
      .from('watchlist_items')
      .select(`
        stock_id,
        watchlists!inner(user_id),
        stocks!inner(symbol, name_zh)
      `);
    if (entryError) throw entryError;

    const alerts: Record<string, unknown>[] = [];
    for (const entry of entries ?? []) {
      const userId = (entry as any).watchlists.user_id;
      const stock = (entry as any).stocks;
      const [{ data: scores }, { data: rules }] = await Promise.all([
        supabase
          .from('stock_score_snapshots')
          .select('total_score, risk_score, signal, as_of, rule_version')
          .eq('stock_id', entry.stock_id)
          .order('as_of', { ascending: false })
          .limit(2),
        supabase
          .from('alert_rules')
          .select('rule_type, config')
          .eq('user_id', userId)
          .eq('is_enabled', true)
          .or(`stock_id.is.null,stock_id.eq.${entry.stock_id}`),
      ]);
      if (!scores?.[0] || !scores?.[1]) continue;
      const current = scores[0];
      const previous = scores[1];

      for (const rule of rules ?? []) {
        if (rule.rule_type === 'score_change') {
          const threshold = Number((rule.config as any)?.threshold ?? 5);
          const change =
            Number(current.total_score) - Number(previous.total_score);
          if (Math.abs(change) >= threshold) {
            alerts.push(buildAlert({
              userId,
              stockId: entry.stock_id,
              stock,
              current,
              type: 'score_change',
              severity: Math.abs(change) >= 10 ? 'warning' : 'info',
              title: `${stock.name_zh} 分數${change > 0 ? '上升' : '下降'}`,
              message: `JASIC Score 由 ${Number(previous.total_score).toFixed(1)} 變為 ${Number(current.total_score).toFixed(1)}。`,
              evidence: { previous: previous.total_score, current: current.total_score, change },
            }));
          }
        }

        if (
          rule.rule_type === 'signal_change' &&
          current.signal !== previous.signal
        ) {
          alerts.push(buildAlert({
            userId,
            stockId: entry.stock_id,
            stock,
            current,
            type: 'signal_change',
            severity: current.signal === 'red' ? 'critical' : 'warning',
            title: `${stock.name_zh} 燈號改變`,
            message: `市場訊號由 ${previous.signal} 變為 ${current.signal}。`,
            evidence: { previous: previous.signal, current: current.signal },
          }));
        }

        if (rule.rule_type === 'risk_level') {
          const threshold = Number((rule.config as any)?.threshold ?? 70);
          if (
            Number(current.risk_score) >= threshold &&
            Number(previous.risk_score) < threshold
          ) {
            alerts.push(buildAlert({
              userId,
              stockId: entry.stock_id,
              stock,
              current,
              type: 'risk_level',
              severity: Number(current.risk_score) >= 85 ? 'critical' : 'warning',
              title: `${stock.name_zh} 風險升高`,
              message: `風險分數已升至 ${Number(current.risk_score).toFixed(1)}。`,
              evidence: { threshold, current: current.risk_score },
            }));
          }
        }
      }
    }

    if (alerts.length) {
      const { error } = await supabase
        .from('alerts')
        .upsert(alerts, { onConflict: 'dedupe_key', ignoreDuplicates: true });
      if (error) throw error;
    }

    return jsonResponse(envelope({
      evaluatedItems: entries?.length ?? 0,
      alertsCreated: alerts.length,
    }));
  } catch (error) {
    console.error(error);
    return jsonResponse(
      errorEnvelope(
        'ALERT_EVALUATION_FAILED',
        error instanceof Error ? error.message : 'Unknown alert error',
      ),
      500,
    );
  }
});

function buildAlert(input: {
  userId: string;
  stockId: string;
  stock: { symbol: string; name_zh: string };
  current: { as_of: string; rule_version: string };
  type: string;
  severity: string;
  title: string;
  message: string;
  evidence: Record<string, unknown>;
}) {
  return {
    user_id: input.userId,
    stock_id: input.stockId,
    severity: input.severity,
    alert_type: input.type,
    title: input.title,
    message: input.message,
    evidence: {
      ...input.evidence,
      symbol: input.stock.symbol,
      data_as_of: input.current.as_of,
      rule_version: input.current.rule_version,
    },
    dedupe_key: [
      input.userId,
      input.stockId,
      input.type,
      input.current.as_of,
    ].join(':'),
    triggered_at: new Date().toISOString(),
  };
}
