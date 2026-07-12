const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const parsed = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const equals = trimmed.indexOf('=');
    if (equals === -1) continue;
    parsed[trimmed.slice(0, equals).trim()] = trimmed
      .slice(equals + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
  }
  return parsed;
}

const localEnv = parseEnvFile(path.join(root, '.env.local'));
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  localEnv.EXPO_PUBLIC_SUPABASE_URL ||
  '';
const publishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  localEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  '';
const cronSecret = process.env.CRON_SECRET || localEnv.CRON_SECRET || '';
const accessToken =
  process.env.JASIC_STAGING_ACCESS_TOKEN ||
  localEnv.JASIC_STAGING_ACCESS_TOKEN ||
  '';

function fail(message) {
  console.error(`Real market demo refused: ${message}`);
  process.exit(1);
}

if (!supabaseUrl || !/^https:\/\/[a-zA-Z0-9-]+\.supabase\.co\/?$/.test(supabaseUrl)) {
  fail('Set EXPO_PUBLIC_SUPABASE_URL in .env.local.');
}

if (!publishableKey || (!publishableKey.startsWith('sb_publishable_') && publishableKey.length < 80)) {
  fail('Set EXPO_PUBLIC_SUPABASE_ANON_KEY to the public anon or publishable key.');
}

if (!cronSecret || cronSecret.length < 32) {
  fail('Set CRON_SECRET in .env.local before running market ingestion.');
}

if (!accessToken) {
  fail('Set JASIC_STAGING_ACCESS_TOKEN in .env.local before running authenticated demo checks.');
}

const baseUrl = supabaseUrl.replace(/\/+$/, '');

async function invoke(functionName, { body = {}, query, bearerToken = publishableKey, cron = false } = {}) {
  const started = Date.now();
  const headers = {
    apikey: publishableKey,
    authorization: `Bearer ${bearerToken}`,
    'content-type': 'application/json',
  };
  if (query) headers['x-jasic-query'] = JSON.stringify(query);
  if (cron) headers['x-cron-secret'] = cronSecret;

  const response = await fetch(`${baseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });

  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { error: { code: 'NON_JSON_RESPONSE', message: text.slice(0, 240) } };
  }

  return {
    functionName,
    status: response.status,
    ok: response.ok,
    ms: Date.now() - started,
    payload,
  };
}

function logStep(title) {
  console.log('');
  console.log(`==> ${title}`);
}

function summarizeResult(result) {
  const error = result.payload?.error;
  const suffix = `${result.status} / ${result.ms}ms`;
  if (result.ok && !error) {
    console.log(`PASS ${result.functionName} (${suffix})`);
    return;
  }
  if (error?.code === 'INSUFFICIENT_DATA') {
    console.log(`INFO ${result.functionName} (${suffix}) - ${error.message}`);
    return;
  }
  console.log(`FAIL ${result.functionName} (${suffix}) - ${error?.message ?? 'Unexpected response'}`);
  process.exitCode = 1;
}

async function main() {
  console.log('JASIC real market data demo');
  console.log('===========================');
  console.log(`Project: ${baseUrl}`);
  console.log('Data sources: TWSE / TPEx public market data');

  logStep('Ingest official TWSE / TPEx market data');
  const ingest = await invoke('market-data-ingest', { cron: true });
  summarizeResult(ingest);
  if (ingest.ok) {
    const data = ingest.payload?.data ?? {};
    console.log(
      `     TWSE date: ${data.twseDate ?? 'n/a'} | TPEx date: ${data.tpexDate ?? 'n/a'} | ` +
        `stocks: ${data.stocks ?? 0} | prices: ${data.prices ?? 0} | institutional flows: ${data.institutionalFlows ?? 0}`,
    );
  }

  logStep('Calculate scores when enough history is available');
  const score = await invoke('score-calculate', { cron: true });
  summarizeResult(score);
  if (score.ok) {
    const data = score.payload?.data ?? {};
    console.log(
      `     tradeDate: ${data.tradeDate ?? 'n/a'} | marketScore: ${data.marketScore ?? 'n/a'} | ` +
        `scores: ${data.scoreCount ?? 0} | discovery: ${data.discoveryCount ?? 0}`,
    );
  }

  logStep('Verify user-facing app APIs');
  const dashboard = await invoke('market-summary', { bearerToken: accessToken });
  summarizeResult(dashboard);
  if (dashboard.ok) {
    const data = dashboard.payload?.data ?? {};
    console.log(
      `     Market Score: ${data.marketScore} | Signal: ${data.signal} | Indicators: ${data.indicators?.length ?? 0}`,
    );
  }

  const discovery = await invoke('discovery-latest', {
    bearerToken: accessToken,
    query: { limit: '5' },
  });
  summarizeResult(discovery);
  if (discovery.ok) {
    const candidates = discovery.payload?.data ?? [];
    console.log(
      `     Top candidates: ${candidates
        .slice(0, 3)
        .map((item) => `${item.rank}.${item.symbol}`)
        .join(', ')}`,
    );
  }

  const dataHealth = await invoke('data-health', { bearerToken: accessToken });
  summarizeResult(dataHealth);
  if (dataHealth.ok) {
    const items = dataHealth.payload?.data?.dataHealth ?? [];
    const connected = items.filter((item) =>
      ['TWSE_STOCK_DAY_ALL', 'TPEX_DAILY_QUOTES', 'TWSE_T86', 'TPEX_3INSTI'].includes(item.code),
    );
    console.log(
      `     Official source checks: ${connected
        .map((item) => `${item.code}:${item.status}`)
        .join(', ')}`,
    );
  }

  const aiCheck = await invoke('ai-check', {
    bearerToken: accessToken,
    body: {
      symbol: '2330',
      cost: 980,
      lots: 1,
      horizon: 'medium',
      riskProfile: 'balanced',
    },
  });
  summarizeResult(aiCheck);
  if (aiCheck.ok) {
    const data = aiCheck.payload?.data ?? {};
    console.log(`     AI Check action: ${data.action} | confidence: ${data.confidence}`);
  }

  console.log('');
  if (process.exitCode) {
    console.log('Real market demo completed with failures. Review the messages above.');
  } else {
    console.log('Real market demo completed.');
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
