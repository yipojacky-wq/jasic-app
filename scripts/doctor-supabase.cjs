const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const supabaseDir = path.join(root, 'supabase');
const functionDir = path.join(supabaseDir, 'functions');
const migrationDir = path.join(supabaseDir, 'migrations');

const expectedFunctions = [
  'account-delete',
  'ai-check',
  'ai-check-history',
  'alert-evaluate',
  'data-health',
  'discovery-latest',
  'market-data-ingest',
  'market-summary',
  'portfolio-summary',
  'profile-settings',
  'report-detail',
  'report-generate',
  'reports-latest',
  'score-calculate',
  'stock-war-room',
  'user-data-export',
  'watchlist-summary',
];

const scheduledNoJwtFunctions = [
  'market-data-ingest',
  'score-calculate',
  'alert-evaluate',
  'report-generate',
];

const checks = [];

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function addCheck(name, ok, detail, remediation) {
  checks.push({ name, ok, detail, remediation });
}

function localSupabaseBinary() {
  const binaryName = process.platform === 'win32' ? 'supabase.cmd' : 'supabase';
  const binaryPath = path.join(root, 'node_modules', '.bin', binaryName);
  return fs.existsSync(binaryPath) ? binaryPath : '';
}

const packageJson = JSON.parse(read('package.json'));

addCheck(
  'Supabase CLI dependency declared',
  Boolean(packageJson.devDependencies?.supabase),
  `supabase package: ${packageJson.devDependencies?.supabase ?? 'missing'}`,
  'Run npm install --save-dev supabase.',
);

const supabaseBinary = localSupabaseBinary();
addCheck(
  'Supabase CLI executable available',
  Boolean(supabaseBinary),
  supabaseBinary || 'local Supabase CLI binary not found',
  'Run npm install, then retry npm run doctor:supabase.',
);

addCheck(
  'Supabase config exists',
  exists('supabase/config.toml'),
  'supabase/config.toml',
  'Restore supabase/config.toml.',
);

const config = exists('supabase/config.toml') ? read('supabase/config.toml') : '';

for (const functionName of expectedFunctions) {
  addCheck(
    `Function exists: ${functionName}`,
    exists(`supabase/functions/${functionName}/index.ts`),
    `supabase/functions/${functionName}/index.ts`,
    `Restore or implement supabase/functions/${functionName}/index.ts.`,
  );
}

for (const functionName of expectedFunctions) {
  const expectedVerifyJwt = scheduledNoJwtFunctions.includes(functionName)
    ? 'false'
    : 'true';
  addCheck(
    `Function JWT config: ${functionName}`,
    config.includes(`[functions.${functionName}]`) &&
      config.includes(`[functions.${functionName}]\nverify_jwt = ${expectedVerifyJwt}`),
    `verify_jwt should be ${expectedVerifyJwt}`,
    `Update supabase/config.toml for [functions.${functionName}].`,
  );
}

const migrations = fs.existsSync(migrationDir)
  ? fs.readdirSync(migrationDir).filter((name) => name.endsWith('.sql')).sort()
  : [];

addCheck(
  'Migrations present',
  migrations.length >= 10,
  `${migrations.length} migration file(s)`,
  'Restore supabase/migrations before deploying staging.',
);

addCheck(
  'Seed file exists',
  exists('supabase/seed.sql'),
  'supabase/seed.sql',
  'Restore seed.sql or document why staging starts empty.',
);

addCheck(
  'Edge typecheck script exists',
  Boolean(packageJson.scripts?.['typecheck:edge']),
  'npm run typecheck:edge',
  'Add typecheck:edge script before deploying functions.',
);

addCheck(
  'Supabase smoke test script configured',
  Boolean(packageJson.scripts?.['smoke:supabase']),
  'npm run smoke:supabase',
  'Add smoke:supabase to package.json scripts.',
);

addCheck(
  'Supabase deployment guide exists',
  exists('docs/SUPABASE_STAGING_RUNBOOK.md'),
  'docs/SUPABASE_STAGING_RUNBOOK.md',
  'Create the Supabase staging runbook.',
);

addCheck(
  'Supabase function deploy script exists',
  exists('scripts/deploy-supabase-functions.ps1'),
  'scripts/deploy-supabase-functions.ps1',
  'Create the batch function deployment script.',
);

addCheck(
  'Supabase secret helper script exists',
  exists('scripts/set-supabase-secrets.ps1'),
  'scripts/set-supabase-secrets.ps1',
  'Create a helper script that sets secrets without committing secret values.',
);

addCheck(
  'Supabase smoke test script exists',
  exists('scripts/smoke-supabase-staging.cjs'),
  'scripts/smoke-supabase-staging.cjs',
  'Create a staging smoke test for deployed Edge Function endpoints.',
);

const envExample = exists('.env.example') ? read('.env.example') : '';
addCheck(
  'Client Supabase env documented',
  envExample.includes('EXPO_PUBLIC_SUPABASE_URL=') &&
    envExample.includes('EXPO_PUBLIC_SUPABASE_ANON_KEY=') &&
    envExample.includes('EXPO_PUBLIC_DEMO_MODE='),
  '.env.example',
  'Document EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY and EXPO_PUBLIC_DEMO_MODE.',
);

addCheck(
  'Secret hygiene warning documented',
  envExample.includes('Never place OpenAI') &&
    envExample.includes('service-role'),
  '.env.example',
  'Warn developers not to expose OpenAI or service-role secrets in EXPO_PUBLIC variables.',
);

const localEnvPath = path.join(root, '.env.local');
if (fs.existsSync(localEnvPath)) {
  const localEnv = fs.readFileSync(localEnvPath, 'utf8');
  addCheck(
    'Local live-mode env shape',
    localEnv.includes('EXPO_PUBLIC_SUPABASE_URL=') &&
      localEnv.includes('EXPO_PUBLIC_SUPABASE_ANON_KEY=') &&
      localEnv.includes('EXPO_PUBLIC_DEMO_MODE=false'),
    '.env.local found',
    'Set EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY and EXPO_PUBLIC_DEMO_MODE=false.',
  );
} else {
  addCheck(
    'Local live-mode env optional',
    true,
    '.env.local not found; demo mode remains safe by default',
    '',
  );
}

const failed = checks.filter((check) => !check.ok);

console.log('JASIC Supabase staging doctor');
console.log('=============================');
for (const check of checks) {
  console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}`);
  console.log(`     ${check.detail}`);
  if (!check.ok) {
    console.log(`     Fix: ${check.remediation}`);
  }
}

console.log('');
if (failed.length) {
  console.log(`${failed.length} Supabase readiness check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log('All Supabase staging readiness checks passed.');
}
