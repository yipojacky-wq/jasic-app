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

const env = parseEnvFile(path.join(root, '.env.local'));

const mappings = [
  {
    secret: 'SUPABASE_URL',
    localKeys: ['SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_URL'],
    validate: (value) => /^https:\/\/[a-zA-Z0-9-]+\.supabase\.co\/?$/.test(value),
    hint: 'Supabase Project URL',
  },
  {
    secret: 'SUPABASE_ANON_KEY',
    localKeys: ['SUPABASE_ANON_KEY', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'],
    validate: (value) => value.startsWith('sb_publishable_') || value.length >= 80,
    hint: 'Supabase publishable / anon key',
  },
  {
    secret: 'CRON_SECRET',
    localKeys: ['CRON_SECRET'],
    validate: (value) => value.length >= 32,
    hint: 'Long random cron secret shared with Supabase Edge Functions',
  },
];

function valueFor(localKeys) {
  for (const key of localKeys) {
    if (process.env[key]) return { key, value: process.env[key] };
    if (env[key]) return { key, value: env[key] };
  }
  return { key: null, value: '' };
}

function redact(value) {
  if (!value) return '[missing]';
  if (value.length <= 12) return '[set]';
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

let failed = false;

console.log('JASIC GitHub Actions secrets doctor');
console.log('===================================');
console.log('');
console.log('Required repository secrets:');

for (const item of mappings) {
  const found = valueFor(item.localKeys);
  const ok = Boolean(found.value) && item.validate(found.value);
  if (!ok) failed = true;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${item.secret}`);
  console.log(`     local source: ${found.key ?? item.localKeys.join(' or ')}`);
  console.log(`     value: ${redact(found.value)}`);
  console.log(`     note: ${item.hint}`);
}

console.log('');
if (failed) {
  console.log('Some required values are missing or invalid. Fix .env.local before copying to GitHub Secrets.');
  process.exit(1);
}

console.log('All required secret values exist locally.');
console.log('');
console.log('Copy them to GitHub:');
console.log('Repository → Settings → Secrets and variables → Actions → Repository secrets');
console.log('');
console.log('Important: this doctor intentionally does not print full secret values.');
