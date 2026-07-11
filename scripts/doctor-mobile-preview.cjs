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

function json(relativePath) {
  return JSON.parse(read(relativePath));
}

function includesAll(content, tokens) {
  return tokens.every((token) => content.includes(token));
}

function addCheck(name, ok, detail, remediation) {
  checks.push({ name, ok, detail, remediation });
}

const packageJson = json('package.json');
const appJson = json('app.json');
const easJson = json('eas.json');
const app = appJson.expo || {};
const android = app.android || {};
const ios = app.ios || {};
const preview = easJson.build?.preview || {};
const mobileChecklist = read('docs/MOBILE_PREVIEW_CHECKLIST.md');
const mobileRunbook = read('docs/MOBILE_BUILD_RUNBOOK.md');
const navigationTests = read('tests/research-navigation.test.ts');
const shareTests = read('tests/research-share.test.ts');
const researchHook = read('src/hooks/useResearchNavigation.ts');
const appRoot = read('App.tsx');
const errorBoundary = read('src/components/ErrorBoundary.tsx');
const envExample = read('.env.example');

addCheck(
  'Mobile preview doctor is registered',
  packageJson.scripts?.['doctor:mobile-preview'] === 'node scripts/doctor-mobile-preview.cjs',
  'package.json scripts.doctor:mobile-preview',
  'Register doctor:mobile-preview in package.json.',
);

addCheck(
  'Expo app identity is stable',
  app.name === 'JASIC Stock Intelligence' &&
    app.slug === 'jasic-app' &&
    app.scheme === 'jasic' &&
    app.orientation === 'portrait' &&
    ios.bundleIdentifier === 'com.jasic.stockintelligence' &&
    android.package === 'com.jasic.stockintelligence',
  'app.json name, slug, scheme, orientation, bundle id, Android package',
  'Keep mobile app identity stable before preview builds.',
);

addCheck(
  'Mobile app assets exist',
  exists('assets/icon.png') &&
    exists('assets/favicon.png') &&
    exists('assets/android-icon-foreground.png') &&
    exists('assets/android-icon-background.png') &&
    exists('assets/android-icon-monochrome.png'),
  'assets/icon.png + Android adaptive icon assets',
  'Restore required Expo icon and Android adaptive icon assets.',
);

addCheck(
  'EAS preview build is configured for internal testing',
  easJson.cli?.version?.includes('>= 16.0.0') &&
    preview.distribution === 'internal' &&
    preview.channel === 'preview' &&
    preview.android?.buildType === 'apk',
  'eas.json preview profile',
  'Configure EAS preview profile for internal APK testing.',
);

addCheck(
  'Deep-link handling is implemented and tested',
  includesAll(researchHook, [
    'Linking.getInitialURL',
    "Linking.addEventListener('url'",
    'parseResearchLocation',
  ]) &&
    includesAll(navigationTests, [
      'jasic://stock/2454',
      'jasic://ai-check/2308',
      'malformed symbols',
    ]),
  'src/hooks/useResearchNavigation.ts + tests/research-navigation.test.ts',
  'Keep native deep-link handling and tests available.',
);

addCheck(
  'Share/export surfaces are covered by tests',
  includesAll(shareTests, [
    'research URLs support web and native sharing',
    'AI Check share includes governance audit',
    'excludes private position inputs',
  ]),
  'tests/research-share.test.ts',
  'Keep mobile share text and privacy behavior tested.',
);

addCheck(
  'App root is protected by ErrorBoundary',
  includesAll(appRoot, ['<ErrorBoundary>', '</ErrorBoundary>']) &&
    includesAll(errorBoundary, ['getDerivedStateFromError', 'componentDidCatch']),
  'App.tsx + src/components/ErrorBoundary.tsx',
  'Wrap app root in ErrorBoundary before mobile preview.',
);

addCheck(
  'Mobile preview checklist is available',
  includesAll(mobileChecklist, [
    'jasic://stock/2330',
    'jasic://ai-check/2330',
    'no guaranteed profit',
    'no automatic trading',
    'Settings / Data Health',
  ]),
  'docs/MOBILE_PREVIEW_CHECKLIST.md',
  'Keep phone validation checklist available.',
);

addCheck(
  'Mobile build runbook is available',
  includesAll(mobileRunbook, [
    'npx eas login',
    'npx eas build --profile preview --platform android',
    'npx eas build --profile preview --platform ios',
    'EXPO_PUBLIC_DEMO_MODE=true',
    'Supabase service-role key',
    'OpenAI API key',
  ]),
  'docs/MOBILE_BUILD_RUNBOOK.md',
  'Add a mobile build runbook for Expo/EAS preview builds.',
);

addCheck(
  'Mobile env safety boundary is documented',
  includesAll(envExample, [
    'EXPO_PUBLIC_DEMO_MODE=true',
    'Never place OpenAI or Supabase service-role secrets',
  ]),
  '.env.example',
  'Document safe mobile env boundaries.',
);

const failed = checks.filter((check) => !check.ok);

console.log('JASIC mobile preview doctor');
console.log('===========================');
for (const check of checks) {
  console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}`);
  console.log(`     ${check.detail}`);
  if (!check.ok) console.log(`     Fix: ${check.remediation}`);
}

console.log('');
if (failed.length) {
  console.log(`${failed.length} mobile preview check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log('All mobile preview checks passed.');
}

