const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');

const checks = [];
const gitCandidates = [
  process.env.GIT_BIN,
  'git',
  path.resolve(root, '..', '..', 'work', 'tools', 'mingit', 'cmd', 'git.exe'),
].filter(Boolean);

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function git(args) {
  for (const gitBin of gitCandidates) {
    try {
      return execFileSync(gitBin, args, {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }).trim();
    } catch (error) {
      // Try the next candidate. The Codex desktop workspace commonly uses a
      // bundled MinGit that is not available on PATH.
    }
  }
  return '';
}

function addCheck(name, ok, detail, remediation) {
  checks.push({ name, ok, detail, remediation });
}

const gitVersion = git(['--version']);
addCheck(
  'Git executable available',
  Boolean(gitVersion),
  gitVersion || 'git executable not found',
  'Install Git, set GIT_BIN, or run inside the Codex workspace with bundled MinGit.',
);

const remote = git(['remote', 'get-url', 'origin']);
addCheck(
  'GitHub origin remote',
  remote === 'https://github.com/yipojacky-wq/jasic-app.git',
  remote || 'origin remote not found',
  'Run npm run github:connect -- -RepoUrl "https://github.com/yipojacky-wq/jasic-app.git"',
);

const branchStatus = git(['status', '--short', '--branch']);
addCheck(
  'Working tree clean',
  branchStatus.includes('## main...origin/main') && branchStatus.split(/\r?\n/).length === 1,
  branchStatus || 'unable to read git status',
  'Commit or stash local changes, then push main.',
);

addCheck(
  'GitHub Pages workflow exists',
  exists('.github/workflows/pages.yml'),
  '.github/workflows/pages.yml',
  'Create the GitHub Pages workflow before publishing.',
);

if (exists('.github/workflows/pages.yml')) {
  const pagesWorkflow = read('.github/workflows/pages.yml');
  addCheck(
    'GitHub Pages publishes gh-pages branch',
    pagesWorkflow.includes('publish_branch: gh-pages') &&
      pagesWorkflow.includes('peaceiris/actions-gh-pages'),
    'pages.yml should publish ./dist to gh-pages',
    'Update pages.yml to publish dist/ to gh-pages.',
  );
}

addCheck(
  'Vercel config exists',
  exists('vercel.json'),
  'vercel.json',
  'Add vercel.json with build command and dist output.',
);

addCheck(
  'Netlify config exists',
  exists('netlify.toml'),
  'netlify.toml',
  'Add netlify.toml with build command and dist publish directory.',
);

addCheck(
  'GitHub Pages post-process script exists',
  exists('scripts/prepare-github-pages.cjs'),
  'scripts/prepare-github-pages.cjs',
  'Add post-process script to rewrite Expo root asset paths.',
);

if (exists('dist/index.html')) {
  const html = read('dist/index.html');
  addCheck(
    'dist index uses relative Expo assets',
    html.includes('src="./_expo/') && html.includes('href="./favicon.ico"'),
    'dist/index.html asset paths checked',
    'Run npm run build:web:github-pages.',
  );
} else {
  addCheck(
    'dist index exists',
    false,
    'dist/index.html not found',
    'Run npm run build:web:github-pages.',
  );
}

addCheck(
  'GitHub Pages nojekyll marker exists',
  exists('dist/.nojekyll'),
  'dist/.nojekyll',
  'Run npm run build:web:github-pages.',
);

addCheck(
  'Prototype runbook exists',
  exists('docs/PROTOTYPE_RUNBOOK.md'),
  'docs/PROTOTYPE_RUNBOOK.md',
  'Restore prototype runbook documentation.',
);

addCheck(
  'Public preview deployment docs exist',
  exists('docs/PUBLIC_PREVIEW_DEPLOYMENT.md'),
  'docs/PUBLIC_PREVIEW_DEPLOYMENT.md',
  'Restore public preview deployment documentation.',
);

const envExample = exists('.env.example') ? read('.env.example') : '';
addCheck(
  'Demo mode documented in env example',
  envExample.includes('EXPO_PUBLIC_DEMO_MODE=true'),
  '.env.example',
  'Add EXPO_PUBLIC_DEMO_MODE=true to .env.example.',
);

const failed = checks.filter((check) => !check.ok);

console.log('JASIC deployment doctor');
console.log('=======================');
for (const check of checks) {
  console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}`);
  console.log(`     ${check.detail}`);
  if (!check.ok) {
    console.log(`     Fix: ${check.remediation}`);
  }
}

console.log('');
if (failed.length) {
  console.log(`${failed.length} deployment readiness check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log('All deployment readiness checks passed.');
}
