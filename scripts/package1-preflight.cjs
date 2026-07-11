const { spawnSync } = require('node:child_process');

const includeDeployDoctor = process.argv.includes('--include-deploy');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const commands = [
  ['run', 'doctor:data-sources'],
  ['run', 'doctor:live-readiness'],
  ['run', 'doctor:score-governance'],
  ['run', 'doctor:production-hardening'],
  ['run', 'doctor:supabase'],
  ['run', 'typecheck'],
  ['run', 'typecheck:edge'],
  ['test'],
  ['run', 'build:web:github-pages'],
];

if (includeDeployDoctor) {
  commands.push(['run', 'doctor:deploy']);
}

console.log('JASIC Package 1 preflight');
console.log('=========================');
console.log(
  includeDeployDoctor
    ? 'Mode: full local preflight including clean-working-tree deploy doctor'
    : 'Mode: standard preflight',
);
console.log('');

for (const args of commands) {
  const label = `${npmCommand} ${args.join(' ')}`;
  console.log(`\n> ${label}`);
  const result =
    process.platform === 'win32'
      ? spawnSync(label, {
          cwd: process.cwd(),
          shell: true,
          stdio: 'inherit',
        })
      : spawnSync(npmCommand, args, {
          cwd: process.cwd(),
          shell: false,
          stdio: 'inherit',
        });

  if (result.error) {
    console.error(`\nFailed to start: ${label}`);
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`\nPackage 1 preflight failed at: ${label}`);
    process.exit(result.status ?? 1);
  }
}

console.log('\nPackage 1 preflight passed.');
console.log(
  includeDeployDoctor
    ? 'Working tree, readiness, type checks, tests and web build are ready.'
    : 'Readiness, type checks, tests and web build are ready.',
);
