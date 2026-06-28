import { createServiceClient } from '../_shared/client.ts';
import {
  envelope,
  errorEnvelope,
  jsonResponse,
  optionsResponse,
} from '../_shared/http.ts';
import {
  dataHealthAction,
  dataHealthMessage,
  dataHealthStatus,
  ingestionQualityRate,
} from '../_shared/governance.ts';
import {
  dataSourceReadinessRegistry,
  dataSourceReadinessSummary,
} from '../_shared/dataSourceRegistry.ts';

type DataSourceRow = {
  code: string;
  provider: string;
  dataset_name: string;
  update_frequency: string;
  attribution_text: string | null;
};

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
  const { error: authError } = await supabase.auth.getUser(
    authHeader.replace(/^Bearer\s+/i, ''),
  );
  if (authError) {
    return jsonResponse(errorEnvelope('AUTH_REQUIRED', 'Invalid session'), 401);
  }

  const [
    { data: sources, error: sourceError },
    { data: runs, error: runError },
    { data: market },
    { data: report },
    { data: rule },
  ] = await Promise.all([
    supabase
      .from('data_sources')
      .select('code, provider, dataset_name, update_frequency, attribution_text')
      .eq('is_active', true)
      .order('code'),
    supabase
      .from('ingestion_runs')
      .select('source_code, dataset_date, status, records_received, records_valid, records_rejected, error_summary, started_at, completed_at')
      .order('completed_at', { ascending: false })
      .limit(30),
    supabase
      .from('market_score_snapshots')
      .select('as_of, rule_version')
      .order('as_of', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('reports')
      .select('as_of, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('rule_versions')
      .select('version, config, change_note')
      .eq('rule_type', 'stock_score')
      .lte('effective_from', new Date().toISOString())
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (sourceError ?? runError) {
    return jsonResponse(
      errorEnvelope('DATABASE_ERROR', (sourceError ?? runError)!.message),
      500,
    );
  }

  const latestRunBySource = new Map<string, any>();
  for (const run of runs ?? []) {
    if (!latestRunBySource.has(run.source_code)) {
      latestRunBySource.set(run.source_code, run);
    }
  }

  const typedSources = (sources ?? []) as DataSourceRow[];
  const dataHealth = typedSources.map((source) => {
    const run = latestRunBySource.get(source.code);
    return {
      code: source.code,
      label: source.dataset_name,
      provider: source.provider,
      frequency: source.update_frequency,
      ...healthForRun(run),
    };
  });
  dataHealth.push({
    code: 'MARKET_SCORE',
    label: 'Market / Stock Score',
    provider: 'JASIC Score Engine',
    frequency: 'derived',
    ...healthForTimestamp(market?.as_of, '尚未產生 Score 快照'),
  });
  dataHealth.push({
    code: 'TREND_REPORTS',
    label: '四種趨勢報告',
    provider: 'JASIC Report Engine',
    frequency: 'derived',
    ...healthForTimestamp(report?.as_of, '尚未產生趨勢報告'),
  });

  const config = rule?.config as Record<string, unknown> | undefined;
  const sourceRegistry = dataSourceReadinessRegistry();
  return jsonResponse(envelope({
    dataHealth,
    methodology: {
      scoreRuleVersion: rule?.version ?? market?.rule_version ?? 'not-configured',
      scoreRuleStatus:
        typeof config?.status === 'string' ? config.status : 'unknown',
      scoreRuleNote:
        rule?.change_note ??
        '尚未載入正式 JASIC Score 規則。',
      sources: typedSources.map((source) => ({
        code: source.code,
        provider: source.provider,
        datasetName: source.dataset_name,
        frequency: source.update_frequency,
        attribution: source.attribution_text,
      })),
    },
    sourceRegistry,
    sourceRegistrySummary: dataSourceReadinessSummary(sourceRegistry),
  }));
});

function healthForRun(run: any) {
  if (!run) {
    return {
      status: 'missing',
      runStatus: null,
      dataAsOf: null,
      lastRunAt: null,
      records: 0,
      recordsReceived: 0,
      recordsRejected: 0,
      qualityRate: null,
      errorSummary: null,
      action: dataHealthAction('missing'),
      message: '尚未執行資料匯入',
    };
  }
  if (!run.dataset_date) {
    const status = run.status === 'failed' ? 'stale' : 'missing';
    return {
      status,
      runStatus: run.status,
      dataAsOf: null,
      lastRunAt: run.completed_at,
      records: run.records_valid,
      recordsReceived: run.records_received,
      recordsRejected: run.records_rejected,
      qualityRate: ingestionQualityRate(run.records_received, run.records_valid),
      errorSummary: run.error_summary,
      action: dataHealthAction(status, run.status),
      message:
        run.status === 'failed'
          ? '最近一次匯入失敗，資料不可用'
          : '資料日期缺失',
    };
  }
  const ageHours =
    (Date.now() - new Date(run.dataset_date).getTime()) / 3600000;
  const status = dataHealthStatus(ageHours, run.status);
  return {
    status,
    runStatus: run.status,
    dataAsOf: run.dataset_date,
    lastRunAt: run.completed_at,
    records: run.records_valid,
    recordsReceived: run.records_received,
    recordsRejected: run.records_rejected,
    qualityRate: ingestionQualityRate(run.records_received, run.records_valid),
    errorSummary: run.error_summary,
    action: dataHealthAction(status, run.status),
    message:
      run.status === 'failed'
        ? '最近一次匯入失敗，請勿使用此資料產生結論'
        : run.status === 'partial'
        ? `部分完成，共 ${run.records_valid} 筆有效資料`
        : dataHealthMessage(status),
  };
}

function healthForTimestamp(value: string | null | undefined, missingMessage: string) {
  if (!value) {
    return {
      status: 'missing' as const,
      runStatus: null,
      dataAsOf: null,
      lastRunAt: null,
      records: 0,
      recordsReceived: 0,
      recordsRejected: 0,
      qualityRate: null,
      errorSummary: null,
      action: dataHealthAction('missing'),
      message: missingMessage,
    };
  }
  const ageHours = (Date.now() - new Date(value).getTime()) / 3600000;
  const status = dataHealthStatus(ageHours);
  return {
    status,
    runStatus: 'completed' as const,
    dataAsOf: value,
    lastRunAt: value,
    records: 0,
    recordsReceived: 0,
    recordsRejected: 0,
    qualityRate: null,
    errorSummary: null,
    action: dataHealthAction(status, 'completed'),
    message: dataHealthMessage(status),
  };
}
