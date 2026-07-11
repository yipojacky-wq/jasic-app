const crypto = require('node:crypto');

const args = process.argv.slice(2);
const showEnv = args.includes('--env');
const bytesArgIndex = args.indexOf('--bytes');
const bytes =
  bytesArgIndex >= 0 && args[bytesArgIndex + 1]
    ? Number(args[bytesArgIndex + 1])
    : 64;

if (!Number.isInteger(bytes) || bytes < 32 || bytes > 256) {
  console.error('CRON_SECRET byte length must be an integer between 32 and 256.');
  process.exit(1);
}

const secret = crypto.randomBytes(bytes).toString('hex');

if (showEnv) {
  console.log(`CRON_SECRET=${secret}`);
} else {
  console.log(secret);
}

