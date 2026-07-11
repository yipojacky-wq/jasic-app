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
const prepareGitHubPages = read('scripts/prepare-github-pages.cjs');
const pwaRunbook = read('docs/PWA_RUNBOOK.md');
const publicSmoke = read('scripts/smoke-public-preview.cjs');
const distIndex = read('dist/index.html');
const manifest = read('dist/manifest.webmanifest');
const serviceWorker = read('dist/service-worker.js');

addCheck(
  'PWA doctor is registered',
  packageJson.scripts?.['doctor:pwa'] === 'node scripts/doctor-pwa.cjs',
  'package.json scripts.doctor:pwa',
  'Register doctor:pwa in package.json.',
);

addCheck(
  'GitHub Pages build emits PWA assets',
  includesAll(prepareGitHubPages, [
    'manifest.webmanifest',
    'service-worker.js',
    'apple-touch-icon.png',
    'pwa-icon.png',
    'navigator.serviceWorker.register',
  ]),
  'scripts/prepare-github-pages.cjs',
  'Update the GitHub Pages post-process script to emit manifest, icons and service worker.',
);

addCheck(
  'PWA runbook exists',
  exists('docs/PWA_RUNBOOK.md') &&
    includesAll(pwaRunbook, [
      'Progressive Web App',
      'Add to Home Screen',
      'https://yipojacky-wq.github.io/jasic-app/',
      'npm run doctor:pwa',
      'automatic trading',
      'guaranteed-profit',
    ]),
  'docs/PWA_RUNBOOK.md',
  'Add a PWA install and validation runbook.',
);

addCheck(
  'Public preview smoke checks PWA shell',
  includesAll(publicSmoke, [
    'manifest.webmanifest',
    'service-worker.js',
    'apple-mobile-web-app-capable',
  ]),
  'scripts/smoke-public-preview.cjs',
  'Extend public preview smoke test to validate PWA manifest and service worker registration.',
);

addCheck(
  'Built dist index includes PWA tags',
  includesAll(distIndex, [
    'rel="manifest"',
    'manifest.webmanifest',
    'apple-mobile-web-app-capable',
    'navigator.serviceWorker.register',
    'service-worker.js',
  ]),
  'dist/index.html',
  'Run npm run build:web:github-pages.',
);

addCheck(
  'Built manifest is installable',
  includesAll(manifest, [
    '"name": "JASIC Stock Intelligence"',
    '"short_name": "JASIC"',
    '"display": "standalone"',
    '"start_url": "./"',
    '"scope": "./"',
    '"icons"',
  ]),
  'dist/manifest.webmanifest',
  'Run npm run build:web:github-pages.',
);

addCheck(
  'Built service worker provides offline shell cache',
  includesAll(serviceWorker, [
    'jasic-pwa-shell',
    'install',
    'activate',
    'fetch',
    './index.html',
  ]),
  'dist/service-worker.js',
  'Run npm run build:web:github-pages.',
);

addCheck(
  'Built PWA icon assets exist',
  exists('dist/pwa-icon.png') && exists('dist/apple-touch-icon.png'),
  'dist/pwa-icon.png + dist/apple-touch-icon.png',
  'Run npm run build:web:github-pages.',
);

const failed = checks.filter((check) => !check.ok);

console.log('JASIC PWA doctor');
console.log('================');
for (const check of checks) {
  console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}`);
  console.log(`     ${check.detail}`);
  if (!check.ok) console.log(`     Fix: ${check.remediation}`);
}

console.log('');
if (failed.length) {
  console.log(`${failed.length} PWA check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log('All PWA checks passed.');
}

