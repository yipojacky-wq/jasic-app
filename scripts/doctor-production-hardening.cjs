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
const appJson = JSON.parse(read('app.json'));
const app = read('App.tsx');
const errorBoundary = read('src/components/ErrorBoundary.tsx');
const deepLinkTests = read('tests/research-navigation.test.ts');
const shareTests = read('tests/research-share.test.ts');
const reportExportTests = read('tests/report-export.test.ts');
const liveSmoke = read('scripts/smoke-live-readiness.cjs');
const deployDoctor = read('scripts/doctor-deploy.cjs');
const docs = read('docs/PHASE_5_PACKAGE_3_PRODUCTION_HARDENING.md');
const mobilePreviewChecklist = read('docs/MOBILE_PREVIEW_CHECKLIST.md');
const e2eSmokeChecklist = read('docs/E2E_SMOKE_CHECKLIST.md');
const abuseControlNotes = read('docs/EDGE_ABUSE_CONTROL_NOTES.md');

addCheck(
  'Production hardening doctor is registered',
  packageJson.scripts?.['doctor:production-hardening'] ===
    'node scripts/doctor-production-hardening.cjs',
  'package.json scripts.doctor:production-hardening',
  'Add "doctor:production-hardening": "node scripts/doctor-production-hardening.cjs" to package.json.',
);

addCheck(
  'Expo mobile identifiers and deep link scheme are configured',
  appJson.expo?.scheme === 'jasic' &&
    appJson.expo?.ios?.bundleIdentifier === 'com.jasic.stockintelligence' &&
    appJson.expo?.android?.package === 'com.jasic.stockintelligence' &&
    appJson.expo?.orientation === 'portrait',
  'app.json scheme, iOS bundle id, Android package and orientation',
  'Configure stable mobile identifiers before preview builds.',
);

addCheck(
  'App root is protected by ErrorBoundary',
  exists('src/components/ErrorBoundary.tsx') &&
    includesAll(errorBoundary, [
      'getDerivedStateFromError',
      'componentDidCatch',
      'JASIC RECOVERY MODE',
      '不保證獲利',
      '自動下單',
    ]) &&
    includesAll(app, [
      "import { ErrorBoundary }",
      '<ErrorBoundary>',
      '</ErrorBoundary>',
    ]),
  'src/components/ErrorBoundary.tsx + App.tsx',
  'Wrap the app root in ErrorBoundary with a safe fallback screen.',
);

addCheck(
  'Deep links and share/export surfaces are covered by tests',
  includesAll(deepLinkTests, [
    'jasic://ai-check/2308',
    '?tab=ai-check&symbol=2330',
  ]) &&
    includesAll(shareTests, [
      'AI Check share includes governance audit',
      '不保證獲利',
    ]) &&
    includesAll(reportExportTests, [
      'report markdown preserves audit, governance and disclaimer fields',
      'No automatic trading',
    ]),
  'research navigation, share and report export tests',
  'Keep deep links, share text and report export covered before mobile preview.',
);

addCheck(
  'Live smoke and deployment doctors remain available',
  includesAll(liveSmoke, [
    'validateAiCheck',
    'response_schema_version',
    'JASIC_STAGING_ACCESS_TOKEN',
  ]) &&
    includesAll(deployDoctor, [
      'GitHub Pages workflow exists',
      'Vercel config exists',
      'Netlify config exists',
    ]),
  'smoke-live-readiness and doctor-deploy scripts',
  'Keep staging smoke and deployment readiness scripts available.',
);

addCheck(
  'Package 3 production hardening document exists',
  exists('docs/PHASE_5_PACKAGE_3_PRODUCTION_HARDENING.md') &&
    includesAll(docs, [
      'Package 3',
      'Error Boundary',
      'Mobile preview',
      'Production hardening',
    ]),
  'docs/PHASE_5_PACKAGE_3_PRODUCTION_HARDENING.md',
  'Document Package 3 hardening scope and remaining mobile preview work.',
);

addCheck(
  'Mobile preview checklist is available',
  exists('docs/MOBILE_PREVIEW_CHECKLIST.md') &&
    includesAll(mobilePreviewChecklist, [
      'jasic://stock/2330',
      'jasic://ai-check/2330',
      'no guaranteed profit',
      'no automatic trading',
    ]),
  'docs/MOBILE_PREVIEW_CHECKLIST.md',
  'Add a mobile preview checklist for Expo / EAS validation.',
);

addCheck(
  'E2E smoke checklist covers core product surfaces',
  exists('docs/E2E_SMOKE_CHECKLIST.md') &&
    includesAll(e2eSmokeChecklist, [
      'Dashboard',
      'Discovery Pool',
      'Stock War Room',
      'AI Check',
      'Watchlist',
      'Reports',
      'Settings / Data Health',
    ]),
  'docs/E2E_SMOKE_CHECKLIST.md',
  'Add an end-to-end smoke checklist for all MVP screens.',
);

addCheck(
  'Edge abuse-control notes are documented',
  exists('docs/EDGE_ABUSE_CONTROL_NOTES.md') &&
    includesAll(abuseControlNotes, [
      'AI Check: 20 requests / user / hour',
      'return `429`',
      'Never expose Supabase service-role key',
      'Never expose OpenAI API key',
    ]),
  'docs/EDGE_ABUSE_CONTROL_NOTES.md',
  'Document rate-limit and abuse-control expectations for Edge Functions.',
);

const failed = checks.filter((check) => !check.ok);

console.log('JASIC production hardening doctor');
console.log('=================================');
for (const check of checks) {
  console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}`);
  console.log(`     ${check.detail}`);
  if (!check.ok) console.log(`     Fix: ${check.remediation}`);
}

console.log('');
if (failed.length) {
  console.log(`${failed.length} production hardening check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log('All production hardening checks passed.');
}
