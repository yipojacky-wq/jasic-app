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
const finalPlan = read('docs/FINAL_3_PHASES_COMPLETION.md');
const stagingChecklist = read('docs/STAGING_LAUNCH_CHECKLIST.md');
const publicPreview = read('docs/PUBLIC_PREVIEW_DEPLOYMENT.md');
const mobileChecklist = read('docs/MOBILE_PREVIEW_CHECKLIST.md');
const productionHardening = read('docs/PHASE_5_PACKAGE_3_PRODUCTION_HARDENING.md');
const pagesWorkflow = read('.github/workflows/pages.yml');
const stagingSmokeWorkflow = read('.github/workflows/staging-smoke.yml');
const ciWorkflow = read('.github/workflows/ci.yml');

addCheck(
  'Final readiness doctor is registered',
  packageJson.scripts?.['doctor:final-readiness'] ===
    'node scripts/doctor-final-readiness.cjs',
  'package.json scripts.doctor:final-readiness',
  'Register doctor:final-readiness in package.json.',
);

addCheck(
  'Final three-phase completion plan exists',
  exists('docs/FINAL_3_PHASES_COMPLETION.md') &&
    includesAll(finalPlan, [
      'Phase A',
      'Supabase staging live backend',
      'Phase B',
      'Public web preview URL',
      'Phase C',
      'Mobile preview and real-device validation',
      'doctor:final-readiness',
      'no guaranteed-profit / auto-trading language',
    ]),
  'docs/FINAL_3_PHASES_COMPLETION.md',
  'Add a clean final three-phase completion plan.',
);

addCheck(
  'Supabase staging launch checklist remains available',
  includesAll(stagingChecklist, [
    'npx supabase db push',
    'npm run supabase:set:secrets',
    'npm run supabase:deploy:functions',
    'npm run smoke:supabase',
    'npm run smoke:live-readiness',
    'JASIC_STAGING_ACCESS_TOKEN',
  ]),
  'docs/STAGING_LAUNCH_CHECKLIST.md',
  'Keep Supabase staging execution steps documented.',
);

addCheck(
  'Public preview deployment path remains available',
  includesAll(publicPreview, [
    'https://yipojacky-wq.github.io/jasic-app/',
    'npm run build:web:github-pages',
    'gh-pages / root',
    'EXPO_PUBLIC_DEMO_MODE=true',
  ]),
  'docs/PUBLIC_PREVIEW_DEPLOYMENT.md',
  'Keep public URL and GitHub Pages setup documented.',
);

addCheck(
  'Mobile preview checklist remains available',
  includesAll(mobileChecklist, [
    'jasic://stock/2330',
    'jasic://ai-check/2330',
    'no guaranteed profit',
    'no automatic trading',
  ]),
  'docs/MOBILE_PREVIEW_CHECKLIST.md',
  'Keep real-device mobile validation checklist documented.',
);

addCheck(
  'Production hardening package remains documented',
  includesAll(productionHardening, [
    'Package 3',
    'Error Boundary',
    'rate-limit',
    'Production hardening',
  ]),
  'docs/PHASE_5_PACKAGE_3_PRODUCTION_HARDENING.md',
  'Keep Package 3 hardening scope documented.',
);

addCheck(
  'GitHub Pages workflow is present',
  includesAll(pagesWorkflow, [
    'peaceiris/actions-gh-pages',
    'publish_branch: gh-pages',
    'npm run build:web:github-pages',
  ]),
  '.github/workflows/pages.yml',
  'Keep GitHub Pages workflow deployable.',
);

addCheck(
  'Staging smoke workflow is present',
  includesAll(stagingSmokeWorkflow, [
    'workflow_dispatch',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'JASIC_STAGING_ACCESS_TOKEN',
    'npm run smoke:live-readiness',
  ]),
  '.github/workflows/staging-smoke.yml',
  'Keep manual staging smoke workflow available.',
);

addCheck(
  'CI includes final readiness doctor',
  includesAll(ciWorkflow, [
    'npm run doctor:final-readiness',
    'npm run doctor:production-hardening',
    'npm run doctor:supabase',
  ]),
  '.github/workflows/ci.yml',
  'Add doctor:final-readiness to CI.',
);

const failed = checks.filter((check) => !check.ok);

console.log('JASIC final readiness doctor');
console.log('============================');
for (const check of checks) {
  console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}`);
  console.log(`     ${check.detail}`);
  if (!check.ok) console.log(`     Fix: ${check.remediation}`);
}

console.log('');
if (failed.length) {
  console.log(`${failed.length} final readiness check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log('All final readiness checks passed.');
}
