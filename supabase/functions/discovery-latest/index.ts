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

  const rawQuery = request.headers.get('x-jasic-query');
  const query = rawQuery ? JSON.parse(rawQuery) as Record<string, string> : {};
  const limit = Math.min(Math.max(Number(query.limit ?? 20), 1), 50);
  const supabase = createServiceClient();

  const { data: run, error: runError } = await supabase
    .from('discovery_runs')
    .select('id, as_of, rule_version')
    .eq('status', 'completed')
    .order('as_of', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (runError) {
    return jsonResponse(errorEnvelope('DATABASE_ERROR', runError.message), 500);
  }
  if (!run) {
    return jsonResponse(errorEnvelope('INSUFFICIENT_DATA', 'No completed discovery run'), 503);
  }

  const { data, error } = await supabase
    .from('discovery_candidates')
    .select(`
      rank,
      discovery_score,
      category,
      risk_flags,
      stock_id,
      stocks!inner(symbol, name_zh, industry_code)
    `)
    .eq('run_id', run.id)
    .order('rank')
    .limit(limit);

  if (error) {
    return jsonResponse(errorEnvelope('DATABASE_ERROR', error.message), 500);
  }

  const candidates = await Promise.all((data ?? []).map(async (row: any) => {
    const { data: score } = await supabase
      .from('stock_score_snapshots')
      .select('total_score, risk_score, signal')
      .eq('stock_id', row.stock_id)
      .lte('as_of', run.as_of)
      .order('as_of', { ascending: false })
      .limit(1)
      .maybeSingle();
    return {
      symbol: row.stocks.symbol,
      name: row.stocks.name_zh,
      industry: row.stocks.industry_code ?? '未分類',
      score: Number(score?.total_score ?? row.discovery_score),
      change: 0,
      signal: score?.signal ?? 'yellow',
      category: row.category,
      risk:
        Number(score?.risk_score ?? 50) >= 70
          ? '高'
          : Number(score?.risk_score ?? 50) >= 40
            ? '中'
            : '低',
    };
  }));

  return jsonResponse(
    envelope(candidates, {
      data_as_of: run.as_of,
      rule_version: run.rule_version,
    }),
  );
});
