const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const checks = [];

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function addCheck(name, ok, detail, remediation) {
  checks.push({ name, ok, detail, remediation });
}

function includesAll(content, tokens) {
  return tokens.every((token) => content.includes(token));
}

const packageJson = JSON.parse(read('package.json'));
const coreMarketMigration = read('supabase/migrations/20260620000100_core_market_tables.sql');
const ingestionMigration = read('supabase/migrations/20260620000200_market_ingestion.sql');
const seedSql = read('supabase/seed.sql');
const marketSummary = read('supabase/functions/market-summary/index.ts');
const discoveryLatest = read('supabase/functions/discovery-latest/index.ts');
const dataHealth = read('supabase/functions/data-health/index.ts');
const scoreCalculate = read('supabase/functions/score-calculate/index.ts');
const marketDataIngest = read('supabase/functions/market-data-ingest/index.ts');
const apiClient = read('src/services/api.ts');
const settingsTypes = read('src/types.ts');

addCheck(
  'Live readiness script is registered',
  packageJson.scripts?.['doctor:live-readiness'] === 'node scripts/doctor-live-readiness.cjs',
  'package.json scripts.doctor:live-readiness',
  'Add "doctor:live-readiness": "node scripts/doctor-live-readiness.cjs" to package.json.',
);

addCheck(
  'Market dashboard schema exists',
  includesAll(coreMarketMigration, [
    'create table if not exists public.market_score_snapshots',
    'create table if not exists public.macro_indicator_definitions',
    'create table if not exists public.macro_indicator_values',
    'score numeric(5,2) not null check (score between 0 and 100)',
    'confidence_score numeric(5,2) not null check (confidence_score between 0 and 100)',
  ]),
  'market_score_snapshots + macro_indicator_* tables',
  'Restore the market dashboard tables in core market migrations.',
);

addCheck(
  'Discovery funnel schema exists',
  includesAll(coreMarketMigration, [
    'create table if not exists public.discovery_runs',
    'create table if not exists public.discovery_candidates',
    "check (status in ('pending', 'running', 'completed', 'failed'))",
    'unique (run_id, rank)',
    'create index if not exists discovery_run_as_of_idx',
  ]),
  'discovery_runs + discovery_candidates tables and indexes',
  'Restore discovery run/candidate tables and completed-run index.',
);

addCheck(
  'Data-health ingestion schema exists',
  includesAll(ingestionMigration, [
    'create table if not exists public.data_sources',
    'create table if not exists public.ingestion_runs',
    'create table if not exists public.stock_daily_prices',
    'create table if not exists public.institutional_flows_daily',
    'create table if not exists public.stock_features_daily',
  ]),
  'data_sources, ingestion_runs, price, flow, feature tables',
  'Restore market ingestion tables before live mode.',
);

addCheck(
  'Official Taiwan source seed exists',
  includesAll(ingestionMigration, [
    'TWSE_STOCK_DAY_ALL',
    'TWSE_T86',
    'TPEX_DAILY_QUOTES',
    'TPEX_3INSTI',
  ]),
  'TWSE / TPEx source rows are seeded by migration',
  'Seed official source rows in data_sources.',
);

addCheck(
  'Macro dashboard seed exists',
  includesAll(seedSql, [
    'insert into public.macro_indicator_definitions',
    'insert into public.macro_indicator_values',
    'is_dashboard_core',
  ]),
  'seed.sql contains macro indicator definitions and values',
  'Add dashboard macro seed rows so market-summary can render in staging.',
);

addCheck(
  'Market-summary reads latest score and macro indicators',
  includesAll(marketSummary, [
    ".from('market_score_snapshots')",
    ".from('macro_indicator_definitions')",
    ".from('macro_indicator_values')",
    "errorEnvelope('INSUFFICIENT_DATA', 'No market score snapshot')",
  ]),
  'market-summary Edge Function dependencies',
  'Restore latest market score + macro indicator reads in market-summary.',
);

addCheck(
  'Discovery-latest reads latest completed funnel run',
  includesAll(discoveryLatest, [
    ".from('discovery_runs')",
    ".eq('status', 'completed')",
    ".from('discovery_candidates')",
    ".from('stock_score_snapshots')",
    "errorEnvelope('INSUFFICIENT_DATA', 'No completed discovery run')",
  ]),
  'discovery-latest Edge Function dependencies',
  'Restore completed discovery run, candidate, and stock score reads.',
);

addCheck(
  'Data-health exposes source registry and latest ingestion state',
  includesAll(dataHealth, [
    ".from('data_sources')",
    ".from('ingestion_runs')",
    'sourceRegistry',
    'sourceRegistrySummary',
    'latestRunBySource',
  ]),
  'data-health source registry + ingestion status',
  'Restore source registry and latest ingestion run logic in data-health.',
);

addCheck(
  'Score pipeline writes market and discovery outputs',
  includesAll(scoreCalculate, [
    ".from('market_score_snapshots').upsert",
    ".from('discovery_runs')",
    ".from('discovery_candidates').insert",
    'calculate_stock_features',
  ]),
  'score-calculate writes market_score_snapshots and discovery candidates',
  'Restore score-calculate output writes before running live staging.',
);

addCheck(
  'Market ingestion writes ingestion-run audit rows',
  includesAll(marketDataIngest, [
    'ingestionRunFromBatch',
    ".from('ingestion_runs').insert",
    'twseDailyPriceBatch',
    'tpexDailyPriceBatch',
    'twseInstitutionalFlowBatch',
    'tpexInstitutionalFlowBatch',
  ]),
  'market-data-ingest adapter batches and ingestion_runs audit',
  'Restore adapter batch ingestion and ingestion_runs persistence.',
);

addCheck(
  'Client live mode targets core staging APIs',
  includesAll(apiClient, [
    "invoke<DashboardData>('market-summary')",
    "invoke<StockCandidate[]>('discovery-latest'",
    "invoke<Omit<SettingsOverview, 'profile'>>('data-health')",
  ]),
  'client API calls market-summary, discovery-latest, data-health',
  'Restore core live API calls in src/services/api.ts.',
);

addCheck(
  'Client settings contract includes source registry',
  includesAll(settingsTypes, [
    'sourceRegistry: DataSourceReadinessItem[]',
    'sourceRegistrySummary: DataSourceReadinessSummary',
    "status: 'connected' | 'pending_review'",
  ]),
  'SettingsOverview contains sourceRegistry and sourceRegistrySummary',
  'Restore source registry fields in src/types.ts.',
);

addCheck(
  'Staging runbook documents live readiness command',
  read('docs/SUPABASE_STAGING_RUNBOOK.md').includes('npm run doctor:live-readiness'),
  'docs/SUPABASE_STAGING_RUNBOOK.md',
  'Document npm run doctor:live-readiness in the staging runbook.',
);

addCheck(
  'Live readiness package output remains deployable',
  exists('scripts/doctor-deploy.cjs') && exists('scripts/doctor-supabase.cjs'),
  'deploy and supabase doctors exist',
  'Restore deployment and Supabase doctors.',
);

const failed = checks.filter((check) => !check.ok);

console.log('JASIC live readiness doctor');
console.log('===========================');
for (const check of checks) {
  console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}`);
  console.log(`     ${check.detail}`);
  if (!check.ok) console.log(`     Fix: ${check.remediation}`);
}

console.log('');
if (failed.length) {
  console.log(`${failed.length} live readiness check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log('All live readiness checks passed.');
}
