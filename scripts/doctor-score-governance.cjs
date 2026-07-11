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

function includesAll(content, tokens) {
  return tokens.every((token) => content.includes(token));
}

function addCheck(name, ok, detail, remediation) {
  checks.push({ name, ok, detail, remediation });
}

const packageJson = JSON.parse(read('package.json'));
const registry = read('supabase/functions/_shared/scoreRuleRegistry.ts');
const scoreCalculate = read('supabase/functions/score-calculate/index.ts');
const migration = read('supabase/migrations/20260628000200_score_rule_registry.sql');
const tests = read('tests/score-rule-registry.test.ts');
const docs = read('docs/PHASE_4_PACKAGE_2_AI_SCORE_GOVERNANCE.md');

addCheck(
  'Score governance doctor is registered',
  packageJson.scripts?.['doctor:score-governance'] === 'node scripts/doctor-score-governance.cjs',
  'package.json scripts.doctor:score-governance',
  'Add "doctor:score-governance": "node scripts/doctor-score-governance.cjs" to package.json.',
);

addCheck(
  'Shared score rule registry exists',
  exists('supabase/functions/_shared/scoreRuleRegistry.ts') &&
    includesAll(registry, [
      'scoreFeatureVersion',
      'currentMarketScoreRule',
      'currentStockScoreRule',
      'currentDiscoveryFunnelRule',
      'market-score-provisional-0.1.0',
      'stock-score-provisional-0.1.0',
      'discovery-funnel-provisional-0.1.0',
    ]),
  'supabase/functions/_shared/scoreRuleRegistry.ts',
  'Restore the shared score rule registry.',
);

addCheck(
  'Score rule registry is seeded to Supabase rule_versions',
  exists('supabase/migrations/20260628000200_score_rule_registry.sql') &&
    includesAll(migration, [
      "'market_score'",
      "'market-score-provisional-0.1.0'",
      "'discovery_funnel'",
      "'discovery-funnel-provisional-0.1.0'",
      'not a production investment formula',
    ]),
  'supabase/migrations/20260628000200_score_rule_registry.sql',
  'Add migration rows for market_score and discovery_funnel rule versions.',
);

addCheck(
  'Score calculation uses current registry versions',
  includesAll(scoreCalculate, [
    "from '../_shared/scoreRuleRegistry.ts'",
    'MARKET_RULE_VERSION',
    'STOCK_RULE_VERSION',
    'DISCOVERY_RULE_VERSION',
    'currentDiscoveryFunnelRule.config.candidateLimit',
  ]),
  'supabase/functions/score-calculate/index.ts',
  'Wire score-calculate to the shared score rule registry.',
);

addCheck(
  'Score rule registry tests exist',
  exists('tests/score-rule-registry.test.ts') &&
    includesAll(tests, [
      'score rule registry exposes explicit current versions',
      'discovery funnel registry matches Top 20 MVP contract',
    ]),
  'tests/score-rule-registry.test.ts',
  'Add tests for score rule version registry behavior.',
);

addCheck(
  'Package 2 documentation mentions score rule registry',
  includesAll(docs, [
    'score rule registry',
    'market-score-provisional-0.1.0',
    'discovery-funnel-provisional-0.1.0',
  ]),
  'docs/PHASE_4_PACKAGE_2_AI_SCORE_GOVERNANCE.md',
  'Document the score rule registry in Package 2 notes.',
);

const failed = checks.filter((check) => !check.ok);

console.log('JASIC score governance doctor');
console.log('=============================');
for (const check of checks) {
  console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}`);
  console.log(`     ${check.detail}`);
  if (!check.ok) console.log(`     Fix: ${check.remediation}`);
}

console.log('');
if (failed.length) {
  console.log(`${failed.length} score governance check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log('All score governance checks passed.');
}
