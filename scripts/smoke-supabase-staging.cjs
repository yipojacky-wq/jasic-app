const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

const functions = [
  'market-summary',
  'discovery-latest',
  'reports-latest',
  'ai-check',
  'market-data-ingest',
  'score-calculate',
  'stock-war-room',
  'watchlist-summary',
  'alert-evaluate',
  'report-generate',
  'report-detail',
  'profile-settings',
  'data-health',
  'user-data-export',
  'account-delete',
  'portfolio-summary',
  'ai-check-history',
];

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const parsed = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const equals = trimmed.indexOf('=');
    if (equals === -1) continue;
    const key = trimmed.slice(0, equals).trim();
    const value = trimmed.slice(equals + 1).trim().replace(/^["']|["']$/g, '');
    parsed[key] = value;
  }
  return parsed;
}

const localEnv = parseEnvFile(path.join(root, '.env.local'));
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  localEnv.EXPO_PUBLIC_SUPABASE_URL ||
  '';
const anonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  localEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  '';

if (!supabaseUrl || supabaseUrl.includes('your-project')) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL. Set it in .env.local or the shell environment.');
  process.exit(1);
}

if (!anonKey || anonKey.includes('your-public-anon-key')) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_ANON_KEY. Set it in .env.local or the shell environment.');
  process.exit(1);
}

const baseUrl = supabaseUrl.replace(/\/+$/, '');

async function checkFunction(functionName) {
  const url = `${baseUrl}/functions/v1/${functionName}`;
  const started = Date.now();
  try {
    const response = await fetch(url, {
      method: 'OPTIONS',
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${anonKey}`,
        origin: 'http://localhost:8081',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'authorization,content-type,apikey',
      },
      signal: AbortSignal.timeout(10000),
    });
    const ms = Date.now() - started;
    const ok = response.status >= 200 && response.status < 500;
    return {
      functionName,
      ok,
      status: response.status,
      ms,
      detail: ok ? 'reachable' : `unexpected status ${response.status}`,
    };
  } catch (error) {
    return {
      functionName,
      ok: false,
      status: 'ERR',
      ms: Date.now() - started,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  console.log('JASIC Supabase staging smoke test');
  console.log('=================================');
  console.log(`Project URL: ${baseUrl}`);
  console.log('Method: OPTIONS /functions/v1/<function>');
  console.log('');

  const results = [];
  for (const functionName of functions) {
    // Sequential requests keep logs readable and avoid provider throttles.
    // eslint-disable-next-line no-await-in-loop
    const result = await checkFunction(functionName);
    results.push(result);
    console.log(
      `${result.ok ? 'PASS' : 'FAIL'} ${functionName} ` +
        `[${result.status}] ${result.ms}ms - ${result.detail}`,
    );
  }

  const failed = results.filter((result) => !result.ok);
  console.log('');
  if (failed.length) {
    console.log(`${failed.length} function endpoint(s) failed smoke test.`);
    process.exit(1);
  }

  console.log('All Supabase function endpoints are reachable.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
