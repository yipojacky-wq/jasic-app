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
const accessToken =
  process.env.JASIC_STAGING_ACCESS_TOKEN ||
  localEnv.JASIC_STAGING_ACCESS_TOKEN ||
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

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validateEnvelope(payload) {
  if (!isObject(payload)) return 'response is not an object';
  if (!('data' in payload)) return 'response is missing data';
  if (!('error' in payload)) return 'response is missing error';
  if (payload.error !== null) {
    return `API error: ${payload.error?.code ?? 'UNKNOWN'} - ${payload.error?.message ?? 'No message'}`;
  }
  return '';
}

function validateMarketSummary(data) {
  if (!isObject(data)) return 'market-summary data is not an object';
  if (!Number.isFinite(Number(data.marketScore))) return 'marketScore is missing';
  if (!Number.isFinite(Number(data.riskScore))) return 'riskScore is missing';
  if (!Array.isArray(data.indicators) || data.indicators.length < 5) {
    return 'expected at least five macro indicators';
  }
  if (!data.ruleVersion) return 'ruleVersion is missing';
  return '';
}

function validateDiscovery(data) {
  if (!Array.isArray(data)) return 'discovery-latest data is not an array';
  if (data.length < 1) return 'expected at least one discovery candidate';
  const first = data[0];
  if (!isObject(first)) return 'first discovery candidate is not an object';
  if (!first.symbol || !Number.isFinite(Number(first.score))) {
    return 'first discovery candidate is missing symbol or score';
  }
  if (!first.layerResults) return 'first discovery candidate is missing layerResults';
  return '';
}

function validateDataHealth(data) {
  if (!isObject(data)) return 'data-health data is not an object';
  if (!Array.isArray(data.dataHealth)) return 'dataHealth is not an array';
  if (!Array.isArray(data.sourceRegistry)) return 'sourceRegistry is not an array';
  if (!isObject(data.sourceRegistrySummary)) return 'sourceRegistrySummary is missing';
  if (Number(data.sourceRegistrySummary.connected) < 4) {
    return 'sourceRegistrySummary.connected should be at least 4';
  }
  return '';
}

function validateAiCheck(data, meta) {
  if (!isObject(data)) return 'ai-check data is not an object';
  if (!['ADD', 'HOLD', 'WAIT', 'REDUCE', 'STOP_LOSS'].includes(data.action)) {
    return 'ai-check action is missing or invalid';
  }
  if (!data.conclusion) return 'ai-check conclusion is missing';
  if (!Array.isArray(data.reasons) || data.reasons.length < 2) {
    return 'ai-check reasons should contain at least two items';
  }
  if (!Array.isArray(data.risks) || data.risks.length < 1) {
    return 'ai-check risks should contain at least one item';
  }
  if (!Array.isArray(data.suggestions) || data.suggestions.length < 1) {
    return 'ai-check suggestions should contain at least one item';
  }
  if (!Number.isFinite(Number(data.confidence))) {
    return 'ai-check confidence is missing';
  }
  if (!isObject(meta)) return 'ai-check response meta is missing';
  if (!meta.rule_version) return 'ai-check rule_version meta is missing';
  if (!meta.model_identifier) return 'ai-check model_identifier meta is missing';
  if (!meta.prompt_version) return 'ai-check prompt_version meta is missing';
  if (!meta.response_schema_version) {
    return 'ai-check response_schema_version meta is missing';
  }
  return '';
}

async function postFunction({ functionName, body = {}, query, bearerToken, validate }) {
  const url = `${baseUrl}/functions/v1/${functionName}`;
  const started = Date.now();
  try {
    const headers = {
      apikey: anonKey,
      authorization: `Bearer ${bearerToken}`,
      'content-type': 'application/json',
    };
    if (query) headers['x-jasic-query'] = JSON.stringify(query);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const text = await response.text();
    const ms = Date.now() - started;
    let payload;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      return {
        functionName,
        ok: false,
        status: response.status,
        ms,
        detail: `response is not JSON: ${text.slice(0, 160)}`,
      };
    }

    if (response.status < 200 || response.status >= 300) {
      return {
        functionName,
        ok: false,
        status: response.status,
        ms,
        detail: payload?.error?.message ?? `unexpected status ${response.status}`,
      };
    }

    const envelopeError = validateEnvelope(payload);
    if (envelopeError) {
      return { functionName, ok: false, status: response.status, ms, detail: envelopeError };
    }

    const shapeError = validate(payload.data, payload.meta);
    return {
      functionName,
      ok: !shapeError,
      status: response.status,
      ms,
      detail: shapeError || 'live data shape is ready',
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

console.log('JASIC live readiness POST smoke test');
console.log('====================================');
console.log(`Project URL: ${baseUrl}`);
console.log('Method: POST /functions/v1/<function>');
console.log(
  accessToken
    ? 'Auth: JASIC_STAGING_ACCESS_TOKEN supplied'
    : 'Auth: no JASIC_STAGING_ACCESS_TOKEN; data-health authenticated check will be skipped',
);
console.log('');

const results = [];

results.push(
  await postFunction({
    functionName: 'market-summary',
    bearerToken: accessToken || anonKey,
    validate: validateMarketSummary,
  }),
);

results.push(
  await postFunction({
    functionName: 'discovery-latest',
    query: { limit: '3' },
    bearerToken: accessToken || anonKey,
    validate: validateDiscovery,
  }),
);

if (accessToken) {
  results.push(
    await postFunction({
      functionName: 'data-health',
      bearerToken: accessToken,
      validate: validateDataHealth,
    }),
  );
  results.push(
    await postFunction({
      functionName: 'ai-check',
      bearerToken: accessToken,
      body: {
        symbol: '2330',
        cost: 980,
        lots: 1,
        horizon: 'medium',
        riskProfile: 'balanced',
      },
      validate: validateAiCheck,
    }),
  );
} else {
  results.push({
    functionName: 'data-health',
    ok: true,
    skipped: true,
    status: 'SKIP',
    ms: 0,
    detail: 'Set JASIC_STAGING_ACCESS_TOKEN to validate authenticated data-health POST.',
  });
  results.push({
    functionName: 'ai-check',
    ok: true,
    skipped: true,
    status: 'SKIP',
    ms: 0,
    detail: 'Set JASIC_STAGING_ACCESS_TOKEN to validate AI Check governance metadata.',
  });
}

for (const result of results) {
  const prefix = result.skipped ? 'SKIP' : result.ok ? 'PASS' : 'FAIL';
  console.log(
    `${prefix} ${result.functionName} [${result.status}] ${result.ms}ms - ${result.detail}`,
  );
}

const failed = results.filter((result) => !result.ok);
console.log('');
if (failed.length) {
  console.log(`${failed.length} live readiness POST check(s) failed.`);
  process.exit(1);
}

console.log('Live readiness POST smoke checks passed.');
