# JASIC Nearly-Free Staging Runbook

Date: 2026-07-11

This runbook completes the final staging phase with the lowest practical cost.

## Target stack

- Mobile/Web app: PWA on GitHub Pages
- Backend: Supabase Free
- Market data: TWSE / TPEx / government open data
- AI mode: `rule_based`
- OpenAI API key: optional, not required for this path

## Required values

You still need these values:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_DEMO_MODE=false
JASIC_AI_MODE=rule_based
CRON_SECRET
JASIC_STAGING_ACCESS_TOKEN
```

OpenAI values are optional:

```text
OPENAI_API_KEY
OPENAI_MODEL
```

## Local `.env.local`

Recommended helper:

```powershell
npm run free-staging:env -- `
  -SupabaseUrl "https://YOUR_PROJECT.supabase.co" `
  -SupabaseAnonKey "YOUR_PUBLIC_ANON_KEY" `
  -StagingAccessToken "YOUR_SHORT_LIVED_USER_TOKEN"
```

Dry run first:

```powershell
npm run free-staging:env -- `
  -SupabaseUrl "https://YOUR_PROJECT.supabase.co" `
  -SupabaseAnonKey "YOUR_PUBLIC_ANON_KEY" `
  -DryRun
```

Manual option:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
EXPO_PUBLIC_DEMO_MODE=false
JASIC_AI_MODE=rule_based
JASIC_STAGING_ACCESS_TOKEN=YOUR_SHORT_LIVED_USER_TOKEN
```

Do not commit `.env.local`.

## Test user access token

Create a Supabase Auth test user first. Then fetch a short-lived token:

```powershell
npm run free-staging:token -- `
  --url "https://YOUR_PROJECT.supabase.co" `
  --anon-key "YOUR_PUBLIC_ANON_KEY" `
  --email "tester@example.com" `
  --password "YOUR_TEST_PASSWORD" `
  --env
```

Dry run:

```powershell
npm run free-staging:token -- `
  --url "https://YOUR_PROJECT.supabase.co" `
  --anon-key "YOUR_PUBLIC_ANON_KEY" `
  --email "tester@example.com" `
  --password "YOUR_TEST_PASSWORD" `
  --dry-run
```

Copy the generated `JASIC_STAGING_ACCESS_TOKEN` into `.env.local` or your shell session. Do not commit it.

## Supabase Edge secrets

Generate a local cron secret:

```powershell
npm run free-staging:secret -- --env
```

Copy the generated `CRON_SECRET` into your shell session, Supabase secrets, and GitHub Actions secrets. Do not commit it.

PowerShell:

```powershell
$env:JASIC_AI_MODE="rule_based"
$env:CRON_SECRET="YOUR_LONG_RANDOM_CRON_SECRET"
npm run supabase:set:secrets
```

This skips `OPENAI_API_KEY` and uses JASIC rule-based AI Check output.

## One-command deployment flow

After `.env.local` is created and Supabase CLI is logged in, dry-run the full free staging flow:

```powershell
$env:CRON_SECRET="YOUR_LONG_RANDOM_CRON_SECRET"
npm run free-staging:deploy -- -ProjectRef "YOUR_PROJECT_REF" -DryRun
```

Then run the live flow:

```powershell
$env:CRON_SECRET="YOUR_LONG_RANDOM_CRON_SECRET"
npm run free-staging:deploy -- -ProjectRef "YOUR_PROJECT_REF"
```

If the Supabase project is already linked, omit `-ProjectRef`.

The deployment flow runs:

1. `npm run package1:preflight`
2. `npm run doctor:staging-env -- --require-live --free-mode`
3. `supabase link`, when `-ProjectRef` is provided
4. `supabase db push`
5. `npm run supabase:set:secrets`
6. `npm run supabase:deploy:functions`
7. `npm run smoke:supabase`
8. `npm run smoke:live-readiness`

## Validation

```bash
npm run doctor:staging-env -- --require-live --free-mode
npm run package1:preflight
npm run smoke:public-preview
npm run smoke:supabase
npm run smoke:live-readiness
```

## What works in free mode

- PWA install on phone
- Supabase Auth
- Watchlist / profile / positions
- Dashboard and Discovery from staging data
- AI Check with rule-based conclusion, reasons, risks, suggestions
- Reports from stored/generated data
- Rate limits and audit metadata

## What is deferred

- OpenAI-generated natural-language summaries
- Higher quality custom AI explanations
- Paid market data
- Production SLA / backups / monitoring

## Upgrade path

When you are ready to use OpenAI:

```powershell
$env:JASIC_AI_MODE="openai"
$env:OPENAI_API_KEY="YOUR_OPENAI_KEY"
$env:OPENAI_MODEL="gpt-5.4-mini"
$env:CRON_SECRET="YOUR_LONG_RANDOM_CRON_SECRET"
npm run supabase:set:secrets
```

Then run:

```bash
npm run doctor:staging-env -- --require-live
```
