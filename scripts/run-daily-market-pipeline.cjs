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
  process.env.SUPABASE_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  localEnv.EXPO_PUBLIC_SUPABASE_URL ||
  '';
const publishableKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  localEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  '';
const cronSecret = process.env.CRON_SECRET || localEnv.CRON_SECRET || '';

function fail(message) {
  console.error(`Daily market pipeline refused: ${message}`);
  process.exit(1);
}

if (!supabaseUrl || !/^https:\/\/[a-zA-Z0-9-]+\.supabase\.co\/?$/.test(supabaseUrl)) {
  fail('Set SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL.');
}

if (!publishableKey || (!publishableKey.startsWith('sb_publishable_') && publishableKey.length < 80)) {
  fail('Set SUPABASE_ANON_KEY or EXPO_PUBLIC_SUPABASE_ANON_KEY.');
}

if (!cronSecret || cronSecret.length < 32) {
  fail('Set CRON_SECRET.');
}

const baseUrl = supabaseUrl.replace(/\/+$/, '');

async function invoke(functionName, body = {}) {
  const started = Date.now();
  const response = await fetch(`${baseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      apikey: publishableKey,
      authorization: `Bearer ${publishableKey}`,
      'content-type': 'application/json',
      'x-cron-secret': cronSecret,
    },
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

function logResult(result) {
  const error = result.payload?.error;
  const suffix = `${result.status} / ${result.ms}ms`;
  if (result.ok && !error) {
    console.log(`PASS ${result.functionName} (${suffix})`);
    return true;
  }
  console.log(`FAIL ${result.functionName} (${suffix}) - ${error?.message ?? 'Unexpected response'}`);
  return false;
}

async function main() {
  console.log('JASIC daily market pipeline');
  console.log('===========================');
  console.log(`Project: ${baseUrl}`);
  console.log(`Run date: ${new Date().toISOString()}`);

  const steps = [
    ['market-data-ingest', {}],
    ['score-calculate', {}],
    ['alert-evaluate', {}],
    ['report-generate', {}],
  ];

  let failed = false;
  for (const [functionName, body] of steps) {
    console.log('');
    console.log(`==> ${functionName}`);
    const result = await invoke(functionName, body);
    const ok = logResult(result);
    if (result.ok && result.payload?.data) {
      console.log(JSON.stringify(result.payload.data, null, 2));
    }
    if (!ok) {
      failed = true;
      break;
    }
  }

  if (failed) {
    console.log('');
    console.log('Daily market pipeline failed. Review the failed step above.');
    process.exit(1);
  }

  console.log('');
  console.log('Daily market pipeline completed.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
