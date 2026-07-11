const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);

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

function argValue(...names) {
  for (const name of names) {
    const index = args.indexOf(name);
    if (index >= 0) return args[index + 1] || '';
  }
  return '';
}

function fail(message) {
  console.error(`Staging token helper refused: ${message}`);
  process.exit(1);
}

const localEnv = parseEnvFile(path.join(root, '.env.local'));
const supabaseUrl =
  argValue('--url', '--supabase-url') ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  localEnv.EXPO_PUBLIC_SUPABASE_URL ||
  '';
const anonKey =
  argValue('--anon-key') ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  localEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  '';
const email = argValue('--email') || process.env.JASIC_STAGING_EMAIL || '';
const password = argValue('--password') || process.env.JASIC_STAGING_PASSWORD || '';
const envFormat = args.includes('--env');
const dryRun = args.includes('--dry-run');

if (!supabaseUrl || !/^https:\/\/[a-zA-Z0-9-]+\.supabase\.co\/?$/.test(supabaseUrl)) {
  fail('Supabase URL should look like https://YOUR_PROJECT.supabase.co.');
}

if (!anonKey || (!anonKey.startsWith('sb_publishable_') && anonKey.length < 80)) {
  fail('Supabase anon/publishable key is missing or looks too short.');
}

if (/service[_-]?role/i.test(anonKey) || anonKey.startsWith('sb_secret_')) {
  fail('Use the public anon or publishable key, not a service-role/secret key.');
}

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  fail('Provide a valid test user email with --email or JASIC_STAGING_EMAIL.');
}

if (!password || password.length < 6) {
  fail('Provide the test user password with --password or JASIC_STAGING_PASSWORD.');
}

if (dryRun) {
  console.log('Staging access token request dry run:');
  console.log(` - Supabase URL: ${supabaseUrl.replace(/\/+$/, '')}`);
  console.log(' - Supabase anon/publishable key: [redacted]');
  console.log(` - Email: ${email}`);
  console.log(' - Password: [redacted]');
  console.log('No network request was made.');
  process.exit(0);
}

const baseUrl = supabaseUrl.replace(/\/+$/, '');

async function main() {
  const response = await fetch(`${baseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(15000),
  });

  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    fail(`Supabase Auth returned non-JSON response: ${text.slice(0, 160)}`);
  }

  if (!response.ok) {
    fail(payload?.msg || payload?.error_description || payload?.error || `HTTP ${response.status}`);
  }

  if (!payload.access_token) {
    fail('Supabase Auth response did not include access_token.');
  }

  if (envFormat) {
    console.log(`JASIC_STAGING_ACCESS_TOKEN=${payload.access_token}`);
  } else {
    console.log(payload.access_token);
  }
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
