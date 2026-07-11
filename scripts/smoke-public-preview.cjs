const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const defaultUrl = 'https://yipojacky-wq.github.io/jasic-app/';
const args = process.argv.slice(2);

function argValue(name) {
  const index = args.indexOf(name);
  if (index === -1) return '';
  return args[index + 1] || '';
}

const offline = args.includes('--offline');
const publicUrl =
  argValue('--url') ||
  process.env.JASIC_PUBLIC_PREVIEW_URL ||
  defaultUrl;

function validateHtml(html) {
  const checks = [
    {
      name: 'HTML title is JASIC Stock Intelligence',
      ok: html.includes('<title>JASIC Stock Intelligence</title>'),
    },
    {
      name: 'Root app mount exists',
      ok: html.includes('<div id="root"></div>'),
    },
    {
      name: 'Expo web bundle is referenced with relative path',
      ok: html.includes('src="./_expo/static/js/web/index-'),
    },
    {
      name: 'Favicon is referenced with relative path',
      ok: html.includes('href="./favicon.ico"'),
    },
  ];
  return checks;
}

async function smokeOnline() {
  const started = Date.now();
  const response = await fetch(publicUrl, {
    method: 'GET',
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  });
  const html = await response.text();
  return {
    status: response.status,
    ms: Date.now() - started,
    finalUrl: response.url,
    checks: [
      {
        name: 'Public preview returns HTTP 200',
        ok: response.status === 200,
      },
      ...validateHtml(html),
    ],
  };
}

function smokeOffline() {
  const indexPath = path.join(root, 'dist', 'index.html');
  const html = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '';
  return {
    status: fs.existsSync(indexPath) ? 'LOCAL' : 'MISSING',
    ms: 0,
    finalUrl: indexPath,
    checks: [
      {
        name: 'Local dist/index.html exists',
        ok: fs.existsSync(indexPath),
      },
      ...validateHtml(html),
    ],
  };
}

async function main() {
  console.log('JASIC public preview smoke test');
  console.log('===============================');
  console.log(offline ? 'Mode: offline dist check' : `URL: ${publicUrl}`);
  console.log('');

  const result = offline ? smokeOffline() : await smokeOnline();
  console.log(`Target: ${result.finalUrl}`);
  console.log(`Status: ${result.status}`);
  if (result.ms) console.log(`Latency: ${result.ms}ms`);
  console.log('');

  for (const check of result.checks) {
    console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}`);
  }

  const failed = result.checks.filter((check) => !check.ok);
  console.log('');
  if (failed.length) {
    console.log(`${failed.length} public preview smoke check(s) failed.`);
    process.exit(1);
  }

  console.log('Public preview smoke checks passed.');
}

main().catch((error) => {
  console.error('Public preview smoke test failed.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
