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
const governance = read('supabase/functions/_shared/aiGovernance.ts');
const aiCheck = read('supabase/functions/ai-check/index.ts');
const aiCheckHistory = read('supabase/functions/ai-check-history/index.ts');
const aiHistoryShared = read('supabase/functions/_shared/aiHistory.ts');
const aiHistoryUi = read('src/components/AiCheckHistory.tsx');
const auditMigration = read('supabase/migrations/20260628000100_ai_check_governance_audit.sql');
const userDataExport = read('supabase/functions/user-data-export/index.ts');
const researchShare = read('src/lib/researchShare.ts');
const reportDetail = read('supabase/functions/report-detail/index.ts');
const reportExport = read('src/lib/reportExport.ts');
const testFile = read('tests/ai-governance.test.ts');
const researchShareTest = read('tests/research-share.test.ts');
const reportExportTest = read('tests/report-export.test.ts');
const docs = read('docs/PHASE_4_PACKAGE_2_AI_SCORE_GOVERNANCE.md');

addCheck(
  'AI governance doctor is registered',
  packageJson.scripts?.['doctor:ai-governance'] === 'node scripts/doctor-ai-governance.cjs',
  'package.json scripts.doctor:ai-governance',
  'Add "doctor:ai-governance": "node scripts/doctor-ai-governance.cjs" to package.json.',
);

addCheck(
  'Shared AI governance module exists',
  exists('supabase/functions/_shared/aiGovernance.ts') &&
    includesAll(governance, [
      'aiCheckPromptVersion',
      'aiCheckResponseSchemaVersion',
      'determineAllowedAiCheckActions',
      'validateAiCheckStructuredResult',
      'containsProhibitedAiCheckClaim',
    ]),
  'supabase/functions/_shared/aiGovernance.ts',
  'Restore the shared AI Check governance module.',
);

addCheck(
  'AI Check Edge Function uses governance module',
  includesAll(aiCheck, [
    "from '../_shared/aiGovernance.ts'",
    'buildAiCheckGovernanceAudit',
    'buildAiCheckSystemPrompt',
    'validateAiCheckStructuredResult',
    'response_schema_version',
  ]),
  'supabase/functions/ai-check/index.ts',
  'Wire ai-check to the shared governance module and return governance metadata.',
);

addCheck(
  'AI Check governance audit schema is migrated',
  exists('supabase/migrations/20260628000100_ai_check_governance_audit.sql') &&
    includesAll(auditMigration, [
      'response_schema_version text not null',
      'allowed_actions jsonb not null',
      'ai_check_results_allowed_actions_array',
    ]),
  'supabase/migrations/20260628000100_ai_check_governance_audit.sql',
  'Add migration columns for response_schema_version and allowed_actions.',
);

addCheck(
  'AI Check history returns governance audit fields',
  includesAll(aiCheckHistory, [
    'response_schema_version',
    'allowed_actions',
  ]) &&
    includesAll(aiHistoryShared, [
      'responseSchemaVersion',
      'allowedActions',
    ]) &&
    includesAll(aiHistoryUi, [
      'AI Governance Audit',
      'selected.responseSchemaVersion',
      'selected.allowedActions.join',
    ]),
  'ai-check-history API, shared normalizer and history UI',
  'Expose governance audit fields in history responses and UI.',
);

addCheck(
  'AI Check prompt blocks prohibited advice',
  includesAll(governance, [
    'Do not guarantee profit.',
    'Do not place trades',
    'prohibitedProfitGuaranteePatterns',
    'prohibitedTradingAutomationPatterns',
  ]),
  'profit guarantee and automatic trading guardrails',
  'Add explicit no-profit-guarantee and no-auto-trading guardrails.',
);

addCheck(
  'AI governance metadata is included in exports and share text',
  includesAll(userDataExport, [
    'response_schema_version',
    'allowed_actions',
  ]) &&
    includesAll(researchShare, [
      'Prompt 版本',
      'Schema 版本',
      '允許動作',
      '不保證獲利',
    ]) &&
    includesAll(reportDetail, [
      'governance_audit',
      'response_schema_version',
      'allowed_actions',
    ]) &&
    includesAll(reportExport, [
      '## Audit',
      'Rule version',
      'AI prompt version',
      'AI response schema version',
      'AI allowed actions',
      '## Disclaimer',
    ]) &&
    includesAll(researchShareTest, [
      'AI Check share includes governance audit',
      'Schema 版本：ai-check-response-1.0.0',
      '允許動作：HOLD, WAIT, REDUCE',
    ]) &&
    includesAll(reportExportTest, [
      'report markdown preserves audit, governance and disclaimer fields',
      'Rule version: rule-1',
      'AI response schema version: ai-check-response-1.0.0',
    ]),
  'user-data-export, research share text, report detail and report markdown export',
  'Include AI governance metadata in export/share/report surfaces and cover it with tests.',
);

addCheck(
  'AI governance tests exist',
  exists('tests/ai-governance.test.ts') &&
    includesAll(testFile, [
      'AI Check governance versions are explicit and auditable',
      'AI Check action guardrail becomes defensive',
      'AI Check structured result rejects disallowed actions',
    ]),
  'tests/ai-governance.test.ts',
  'Add unit tests for AI Check governance behavior.',
);

addCheck(
  'Package 2 governance documentation exists',
  exists('docs/PHASE_4_PACKAGE_2_AI_SCORE_GOVERNANCE.md') &&
    includesAll(docs, [
      'AI Check / Score Governance',
      'source data timestamp',
      'AI response schema version',
      'allowed action guardrail',
      'report detail can carry optional `governanceAudit`',
    ]),
  'docs/PHASE_4_PACKAGE_2_AI_SCORE_GOVERNANCE.md',
  'Document the Package 2 governance scope and remaining work.',
);

const failed = checks.filter((check) => !check.ok);

console.log('JASIC AI governance doctor');
console.log('==========================');
for (const check of checks) {
  console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}`);
  console.log(`     ${check.detail}`);
  if (!check.ok) console.log(`     Fix: ${check.remediation}`);
}

console.log('');
if (failed.length) {
  console.log(`${failed.length} AI governance check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log('All AI governance checks passed.');
}
