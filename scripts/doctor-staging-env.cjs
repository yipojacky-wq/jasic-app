const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const requireLive = process.argv.includes('--require-live');
const checks = [];

function readEnvFile(relativePath) {
  const filePath = path.join(root, relativePath);
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

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
}

function addCheck(name, ok, detail, remediation, required = true) {
  checks.push({ name, ok, detail, remediation, required });
}

function pickValue(key, localEnv) {
  return process.env[key] || localEnv[key] || '';
}

function looksFilled(value, placeholders = []) {
  if (!value) return false;
  const normalized = value.toLowerCase();
  if (normalized === 'todo') return false;
  if (normalized.includes('your-')) return false;
  if (normalized.includes('example.com')) return false;
  if (normalized.includes('placeholder')) return false;
  return !placeholders.some((placeholder) => normalized.includes(placeholder));
}

function redactedStatus(value) {
  if (!value) return 'missing';
  if (!looksFilled(value)) return 'placeholder';
  return 'present';
}

const localEnv = readEnvFile('.env.local');
const envExample = read('.env.example');
const stagingWorksheet = read('docs/STAGING_VALUES_WORKSHEET.md');
const stagingChecklist = read('docs/STAGING_LAUNCH_CHECKLIST.md');
const finalPlan = read('docs/FINAL_3_PHASES_COMPLETION.md');

const supabaseUrl = pickValue('EXPO_PUBLIC_SUPABASE_URL', localEnv);
const anonKey = pickValue('EXPO_PUBLIC_SUPABASE_ANON_KEY', localEnv);
const demoMode = pickValue('EXPO_PUBLIC_DEMO_MODE', localEnv);
const openAiKey = pickValue('OPENAI_API_KEY', localEnv);
const openAiModel = pickValue('OPENAI_MODEL', localEnv);
const cronSecret = pickValue('CRON_SECRET', localEnv);
const stagingAccessToken = pickValue('JASIC_STAGING_ACCESS_TOKEN', localEnv);

addCheck(
  'Staging env doctor is documented in final plan',
  finalPlan.includes('doctor:staging-env') && finalPlan.includes('--require-live'),
  'docs/FINAL_3_PHASES_COMPLETION.md',
  'Document npm run doctor:staging-env and the live-mode gate.',
);

addCheck(
  'Env example keeps public and private boundaries clear',
  envExample.includes('EXPO_PUBLIC_SUPABASE_URL=') &&
    envExample.includes('EXPO_PUBLIC_SUPABASE_ANON_KEY=') &&
    envExample.includes('EXPO_PUBLIC_DEMO_MODE=true') &&
    envExample.includes('Never place OpenAI or Supabase service-role secrets'),
  '.env.example',
  'Keep public client env values separate from private backend secrets.',
);

addCheck(
  'Staging worksheet lists required owner-supplied values',
  stagingWorksheet.includes('Supabase project ref') &&
    stagingWorksheet.includes('Supabase anon key') &&
    stagingWorksheet.includes('OpenAI API key') &&
    stagingWorksheet.includes('CRON_SECRET') &&
    stagingWorksheet.includes('JASIC_STAGING_ACCESS_TOKEN'),
  'docs/STAGING_VALUES_WORKSHEET.md',
  'Keep owner-supplied staging values documented.',
);

addCheck(
  'Staging launch checklist includes deploy and smoke commands',
  stagingChecklist.includes('npx supabase db push') &&
    stagingChecklist.includes('npm run supabase:set:secrets') &&
    stagingChecklist.includes('npm run supabase:deploy:functions') &&
    stagingChecklist.includes('npm run smoke:supabase') &&
    stagingChecklist.includes('npm run smoke:live-readiness'),
  'docs/STAGING_LAUNCH_CHECKLIST.md',
  'Keep staging deployment and smoke commands documented.',
);

addCheck(
  'Supabase secret setter script exists',
  exists('scripts/set-supabase-secrets.ps1'),
  'scripts/set-supabase-secrets.ps1',
  'Restore the Supabase secret helper script.',
);

addCheck(
  'Supabase function deploy script exists',
  exists('scripts/deploy-supabase-functions.ps1'),
  'scripts/deploy-supabase-functions.ps1',
  'Restore the Supabase function deploy script.',
);

const liveChecks = [
  {
    name: 'Live Supabase URL is configured',
    ok: looksFilled(supabaseUrl, ['todo.supabase.co']),
    detail: `EXPO_PUBLIC_SUPABASE_URL is ${redactedStatus(supabaseUrl)}`,
    remediation: 'Set EXPO_PUBLIC_SUPABASE_URL in .env.local or the shell environment.',
  },
  {
    name: 'Live Supabase anon key is configured',
    ok: looksFilled(anonKey),
    detail: `EXPO_PUBLIC_SUPABASE_ANON_KEY is ${redactedStatus(anonKey)}`,
    remediation: 'Set EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.local or the shell environment.',
  },
  {
    name: 'Live demo mode is disabled',
    ok: demoMode === 'false',
    detail: `EXPO_PUBLIC_DEMO_MODE is ${demoMode || 'missing'}`,
    remediation: 'Set EXPO_PUBLIC_DEMO_MODE=false for live-mode staging validation.',
  },
  {
    name: 'OpenAI API key is available for Edge secrets',
    ok: looksFilled(openAiKey),
    detail: `OPENAI_API_KEY is ${redactedStatus(openAiKey)}`,
    remediation: 'Set OPENAI_API_KEY only in the shell or Supabase secrets, never in EXPO_PUBLIC_*.',
  },
  {
    name: 'OpenAI model is configured',
    ok: looksFilled(openAiModel || 'gpt-5.4-mini'),
    detail: `OPENAI_MODEL is ${openAiModel ? 'present' : 'default:gpt-5.4-mini'}`,
    remediation: 'Set OPENAI_MODEL if you need a non-default model.',
  },
  {
    name: 'Cron secret is available for scheduled functions',
    ok: looksFilled(cronSecret) && cronSecret.length >= 32,
    detail: `CRON_SECRET is ${redactedStatus(cronSecret)}`,
    remediation: 'Generate a long random CRON_SECRET and set it in Supabase and GitHub Actions.',
  },
  {
    name: 'Short-lived staging user token is available for authenticated smoke',
    ok: looksFilled(stagingAccessToken),
    detail: `JASIC_STAGING_ACCESS_TOKEN is ${redactedStatus(stagingAccessToken)}`,
    remediation: 'Set a short-lived Supabase user access token before running smoke:live-readiness.',
  },
];

for (const check of liveChecks) {
  addCheck(check.name, requireLive ? check.ok : true, check.detail, check.remediation, requireLive);
}

const failed = checks.filter((check) => !check.ok && check.required);

console.log('JASIC staging environment doctor');
console.log('================================');
console.log(requireLive ? 'Mode: require live staging values' : 'Mode: planning / documentation');
console.log('');

for (const check of checks) {
  const status = check.ok ? 'PASS' : check.required ? 'FAIL' : 'INFO';
  console.log(`${status} ${check.name}`);
  console.log(`     ${check.detail}`);
  if (!check.ok && check.required) console.log(`     Fix: ${check.remediation}`);
}

console.log('');
if (failed.length) {
  console.log(`${failed.length} staging environment check(s) failed.`);
  process.exitCode = 1;
} else if (requireLive) {
  console.log('Live staging environment values are ready.');
} else {
  console.log('Staging environment planning checks passed.');
  console.log('Run with --require-live when real Supabase/OpenAI values are available.');
}

