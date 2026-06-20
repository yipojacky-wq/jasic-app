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
  const { data: score, error: scoreError } = await supabase
    .from('market_score_snapshots')
    .select('*')
    .order('as_of', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (scoreError) {
    return jsonResponse(errorEnvelope('DATABASE_ERROR', scoreError.message), 500);
  }
  if (!score) {
    return jsonResponse(errorEnvelope('INSUFFICIENT_DATA', 'No market score snapshot'), 503);
  }

  const { data: definitions, error: indicatorError } = await supabase
    .from('macro_indicator_definitions')
    .select('id, code, name_zh, display_order')
    .eq('is_dashboard_core', true)
    .order('display_order');

  if (indicatorError) {
    return jsonResponse(errorEnvelope('DATABASE_ERROR', indicatorError.message), 500);
  }

  const indicators = await Promise.all(
    ((definitions ?? []) as Array<{
      id: string;
      code: string;
      name_zh: string;
      display_order: number;
    }>).map(async (definition) => {
      const { data: value } = await supabase
        .from('macro_indicator_values')
        .select('display_value, value, trend_note, state, released_at')
        .eq('indicator_id', definition.id)
        .order('observation_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      return {
        label: definition.name_zh,
        value: value?.display_value ?? String(value?.value ?? '—'),
        trend: value?.trend_note ?? '等待最新資料',
        state: value?.state ?? 'neutral',
      };
    }),
  );

  const regimeLabels: Record<string, string> = {
    risk_on: 'Risk On',
    neutral_rotation: 'Neutral / Rotation',
    high_volatility: 'High Volatility',
    risk_off: 'Risk Off',
  };

  const strategy = score.strategy_bias as Record<string, unknown>;
  const summary =
    typeof strategy?.summary === 'string'
      ? strategy.summary
      : '市場資料已更新；請依總經、資金與風險訊號進行分層判讀。';

  return jsonResponse(
    envelope(
      {
        marketScore: Number(score.score),
        riskScore: Number(score.risk_score),
        regime: regimeLabels[score.market_regime] ?? score.market_regime,
        signal: score.signal,
        indicators,
        summary,
        dataAsOf: score.as_of,
      },
      {
        data_as_of: score.as_of,
        rule_version: score.rule_version,
      },
    ),
  );
});
