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
const targetTradingDays = clampNumber(process.env.JASIC_BACKFILL_TRADING_DAYS, 25, 20, 60);
const batchCalendarDays = clampNumber(process.env.JASIC_BACKFILL_BATCH_DAYS, 5, 1, 10);
const maxBatches = clampNumber(process.env.JASIC_BACKFILL_MAX_BATCHES, 18, 1, 40);

function fail(message) {
  console.error(`Market backfill refused: ${message}`);
  process.exit(1);
}

if (!supabaseUrl || !/^https:\/\/[a-zA-Z0-9-]+\.supabase\.co\/?$/.test(supabaseUrl)) {
  fail('Set EXPO_PUBLIC_SUPABASE_URL in .env.local.');
}

if (!publishableKey || (!publishableKey.startsWith('sb_publishable_') && publishableKey.length < 80)) {
  fail('Set EXPO_PUBLIC_SUPABASE_ANON_KEY to the public anon or publishable key.');
}

if (!cronSecret || cronSecret.length < 32) {
  fail('Set CRON_SECRET in .env.local before running market backfill.');
}

const baseUrl = supabaseUrl.replace(/\/+$/, '');

async function invoke(functionName, { body = {}, cron = false } = {}) {
  const started = Date.now();
  const headers = {
    apikey: publishableKey,
    authorization: `Bearer ${publishableKey}`,
    'content-type': 'application/json',
  };
  if (cron) headers['x-cron-secret'] = cronSecret;

  const response = await fetch(`${baseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
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

async function main() {
  console.log('JASIC historical market backfill');
  console.log('================================');
  console.log(`Project: ${baseUrl}`);
  console.log(`Target trading days: ${targetTradingDays}`);
  console.log(`Batch calendar days: ${batchCalendarDays}`);

  let cursorDate;
  let totalImportedTradingDays = 0;
  let totalPrices = 0;
  let totalFlows = 0;
  let scoreResult;
  let latestScoreReady = false;

  for (let batch = 1; batch <= maxBatches; batch += 1) {
    const body = {
      targetTradingDays,
      batchCalendarDays,
      ...(cursorDate ? { cursorDate } : {}),
    };
    const result = await invoke('market-data-backfill', { body, cron: true });
    if (!result.ok) {
      const error = result.payload?.error;
      throw new Error(
        `market-data-backfill failed (${result.status}): ${error?.message ?? 'Unexpected response'}`,
      );
    }

    const data = result.payload?.data ?? {};
    const completedDays = (data.days ?? []).filter((day) => day.status === 'completed');
    totalImportedTradingDays += Number(data.tradingDaysImported ?? completedDays.length ?? 0);
    totalPrices += Number(data.prices ?? 0);
    totalFlows += Number(data.institutionalFlows ?? 0);
    cursorDate = data.nextCursorDate;

    console.log(
      `PASS batch ${batch} (${result.ms}ms) | imported days: ${data.tradingDaysImported} | ` +
        `prices: ${data.prices} | flows: ${data.institutionalFlows} | next: ${cursorDate}`,
    );
    for (const day of data.days ?? []) {
      const suffix = day.status === 'completed'
        ? `prices=${day.prices}, flows=${day.institutionalFlows}`
        : day.reason;
      console.log(`     ${day.tradeDate} ${day.status} ${suffix}`);
    }

    scoreResult = await invoke('score-calculate', { cron: true });
    if (scoreResult.ok) {
      const scoreData = scoreResult.payload?.data ?? {};
      latestScoreReady = true;
      console.log(
        `PASS score-calculate | tradeDate: ${scoreData.tradeDate} | scores: ${scoreData.scoreCount} | ` +
          `discovery: ${scoreData.discoveryCount} | marketScore: ${scoreData.marketScore}`,
      );
      if (totalImportedTradingDays >= targetTradingDays) {
        break;
      }
      console.log(`INFO score is ready; continuing backfill until ${targetTradingDays} trading days are imported in this run.`);
      continue;
    }

    const error = scoreResult.payload?.error;
    if (error?.code !== 'INSUFFICIENT_DATA') {
      throw new Error(`score-calculate failed (${scoreResult.status}): ${error?.message ?? 'Unexpected response'}`);
    }
    console.log(`INFO score-calculate waiting for more history: ${error.message}`);

    if (totalImportedTradingDays >= targetTradingDays) {
      console.log('INFO backfill target reached; score still needs more overlapping per-stock history.');
      break;
    }
  }

  console.log('');
  console.log('Backfill summary');
  console.log('----------------');
  console.log(`Imported trading days in this run: ${totalImportedTradingDays}`);
  console.log(`Price rows upserted: ${totalPrices}`);
  console.log(`Institutional flow rows upserted: ${totalFlows}`);
  if (latestScoreReady || scoreResult?.ok) {
    console.log('Scoring status: ready');
  } else {
    console.log('Scoring status: still waiting for enough history');
  }
}

function clampNumber(value, fallback, minimum, maximum) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(minimum, Math.min(maximum, Math.trunc(parsed)));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
