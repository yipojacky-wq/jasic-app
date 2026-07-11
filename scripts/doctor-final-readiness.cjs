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
const freeStagingRunbook = read('docs/FREE_STAGING_RUNBOOK.md');
const publicPreview = read('docs/PUBLIC_PREVIEW_DEPLOYMENT.md');
const mobileChecklist = read('docs/MOBILE_PREVIEW_CHECKLIST.md');
const mobileBuildRunbook = read('docs/MOBILE_BUILD_RUNBOOK.md');
const pwaRunbook = read('docs/PWA_RUNBOOK.md');
const productionHardening = read('docs/PHASE_5_PACKAGE_3_PRODUCTION_HARDENING.md');
const pagesWorkflow = read('.github/workflows/pages.yml');
const publicPreviewSmokeWorkflow = read('.github/workflows/public-preview-smoke.yml');
const stagingSmokeWorkflow = read('.github/workflows/staging-smoke.yml');
const ciWorkflow = read('.github/workflows/ci.yml');
const publicPreviewSmoke = read('scripts/smoke-public-preview.cjs');
const stagingEnvDoctor = read('scripts/doctor-staging-env.cjs');
const mobilePreviewDoctor = read('scripts/doctor-mobile-preview.cjs');
const pwaDoctor = read('scripts/doctor-pwa.cjs');
const freeStagingDeploy = read('scripts/deploy-free-staging.ps1');
const cronSecretGenerator = read('scripts/generate-cron-secret.cjs');
const stagingTokenHelper = read('scripts/get-staging-access-token.cjs');

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
      'Mobile-first option',
      'doctor:mobile-preview',
      'doctor:pwa',
      'PWA_RUNBOOK.md',
      'doctor:final-readiness',
      'doctor:staging-env',
      '--require-live',
      '--free-mode',
      'FREE_STAGING_RUNBOOK.md',
      'smoke:public-preview',
      'no guaranteed-profit / auto-trading language',
    ]),
  'docs/FINAL_3_PHASES_COMPLETION.md',
  'Add a clean final three-phase completion plan.',
);

addCheck(
  'Nearly-free staging runbook is available',
  exists('docs/FREE_STAGING_RUNBOOK.md') &&
    includesAll(freeStagingRunbook, [
      'Supabase Free',
      'JASIC_AI_MODE=rule_based',
      'OPENAI_API_KEY',
      'npm run free-staging:secret',
      'npm run free-staging:token',
      'npm run free-staging:env',
      'npm run free-staging:deploy',
      'npm run doctor:staging-env -- --require-live --free-mode',
      'npm run supabase:set:secrets',
    ]),
  'docs/FREE_STAGING_RUNBOOK.md',
  'Add a nearly-free staging runbook for Supabase Free and rule-based AI.',
);

addCheck(
  'Cron secret generator is available',
  packageJson.scripts?.['free-staging:secret'] === 'node scripts/generate-cron-secret.cjs' &&
    includesAll(cronSecretGenerator, [
      'crypto.randomBytes',
      'CRON_SECRET',
      '--env',
      '--bytes',
    ]),
  'scripts/generate-cron-secret.cjs',
  'Add a local CRON_SECRET generator for free staging setup.',
);

addCheck(
  'Staging access token helper is available',
  packageJson.scripts?.['free-staging:token'] === 'node scripts/get-staging-access-token.cjs' &&
    includesAll(stagingTokenHelper, [
      '/auth/v1/token?grant_type=password',
      'JASIC_STAGING_ACCESS_TOKEN',
      '--email',
      '--password',
      '--dry-run',
      '--env',
    ]),
  'scripts/get-staging-access-token.cjs',
  'Add a helper to fetch a short-lived Supabase user token for staging smoke tests.',
);

addCheck(
  'Nearly-free staging deployment helper is available',
  packageJson.scripts?.['free-staging:deploy'] ===
    'powershell -NoProfile -ExecutionPolicy Bypass -File scripts/deploy-free-staging.ps1' &&
    includesAll(freeStagingDeploy, [
      'doctor:staging-env',
      '--require-live',
      '--free-mode',
      'supabase:set:secrets',
      'supabase:deploy:functions',
      'smoke:live-readiness',
    ]),
  'scripts/deploy-free-staging.ps1',
  'Add a one-command free staging deployment helper.',
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
  'Mobile build runbook and doctor are available',
  packageJson.scripts?.['doctor:mobile-preview'] === 'node scripts/doctor-mobile-preview.cjs' &&
    includesAll(mobilePreviewDoctor, [
      'eas.json preview profile',
      'jasic://stock/2454',
      'jasic://ai-check/2308',
      'npx eas build --profile preview --platform android',
    ]) &&
    includesAll(mobileBuildRunbook, [
      'npx eas login',
      'npx eas build --profile preview --platform android',
      'npx eas build --profile preview --platform ios',
    ]),
  'scripts/doctor-mobile-preview.cjs + docs/MOBILE_BUILD_RUNBOOK.md',
  'Add mobile preview doctor and Expo/EAS build runbook.',
);

addCheck(
  'PWA runbook and doctor are available',
  packageJson.scripts?.['doctor:pwa'] === 'node scripts/doctor-pwa.cjs' &&
    includesAll(pwaDoctor, [
      'manifest.webmanifest',
      'service-worker.js',
      'apple-touch-icon.png',
      'pwa-icon.png',
    ]) &&
    includesAll(pwaRunbook, [
      'Progressive Web App',
      'Add to Home Screen',
      'https://yipojacky-wq.github.io/jasic-app/',
    ]),
  'scripts/doctor-pwa.cjs + docs/PWA_RUNBOOK.md',
  'Add PWA doctor and install runbook for no-store mobile delivery.',
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
  'Public preview smoke script is available',
  packageJson.scripts?.['smoke:public-preview'] === 'node scripts/smoke-public-preview.cjs' &&
    includesAll(publicPreviewSmoke, [
      'https://yipojacky-wq.github.io/jasic-app/',
      '--offline',
      'Public preview returns HTTP 200',
      'src="./_expo/static/js/web/index-',
    ]),
  'scripts/smoke-public-preview.cjs',
  'Add smoke:public-preview to validate the public GitHub Pages URL.',
);

addCheck(
  'Public preview smoke workflow is present',
  includesAll(publicPreviewSmokeWorkflow, [
    'workflow_dispatch',
    'schedule',
    'npm run smoke:public-preview',
  ]),
  '.github/workflows/public-preview-smoke.yml',
  'Add a manual/scheduled workflow to verify the public preview URL.',
);

addCheck(
  'Staging environment doctor is available',
  packageJson.scripts?.['doctor:staging-env'] === 'node scripts/doctor-staging-env.cjs' &&
    includesAll(stagingEnvDoctor, [
      '--require-live',
      '--free-mode',
      'JASIC_AI_MODE',
      'EXPO_PUBLIC_SUPABASE_URL',
      'EXPO_PUBLIC_SUPABASE_ANON_KEY',
      'OPENAI_API_KEY',
      'CRON_SECRET',
      'JASIC_STAGING_ACCESS_TOKEN',
    ]),
  'scripts/doctor-staging-env.cjs',
  'Add a staging env doctor that can validate live staging values without leaking secrets.',
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
    'npm run doctor:pwa',
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
