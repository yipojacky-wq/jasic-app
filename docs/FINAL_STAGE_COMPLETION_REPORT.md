# JASIC Final Stage Completion Report

Date: 2026-07-12

## Completion status

The final engineering stage is complete.

JASIC is now ready for nearly-free staging deployment with:

- PWA delivery through GitHub Pages
- Supabase Free backend path
- TWSE / TPEx / government open-data source strategy
- Rule-based AI Check mode without requiring OpenAI API
- One-command local staging env helper
- One-command staging deployment helper
- Public preview smoke test
- PWA installability checks
- Supabase staging readiness checks
- Production hardening checks
- Authenticated staging smoke test for market-summary, discovery-latest, data-health and AI Check

## Public PWA

Current public PWA URL:

```text
https://yipojacky-wq.github.io/jasic-app/
```

This public PWA is now built against the Supabase staging backend:

```text
https://hxftprkavdearldqdwps.supabase.co
```

The public preview smoke gate verifies:

- HTTP 200
- Expo web bundle
- PWA manifest
- iOS home-screen meta tags
- Service Worker registration

## Nearly-free staging path

Required owner-provided values:

```text
YOUR_PROJECT_REF
https://YOUR_PROJECT.supabase.co
YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY
YOUR_TEST_USER_EMAIL
YOUR_TEST_USER_PASSWORD
YOUR_LONG_RANDOM_CRON_SECRET
```

OpenAI is optional. The default free staging path uses:

```text
JASIC_AI_MODE=rule_based
```

## Final deployment commands

Generate a cron secret:

```powershell
npm run free-staging:secret -- --env
```

Fetch a test user token:

```powershell
npm run free-staging:token -- `
  --url "https://YOUR_PROJECT.supabase.co" `
  --anon-key "YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY" `
  --email "tester@example.com" `
  --password "YOUR_TEST_PASSWORD" `
  --env
```

Create local staging env:

```powershell
npm run free-staging:env -- `
  -SupabaseUrl "https://YOUR_PROJECT.supabase.co" `
  -SupabaseAnonKey "YOUR_PUBLIC_ANON_KEY" `
  -StagingAccessToken "YOUR_SHORT_LIVED_USER_TOKEN"
```

Deploy free staging:

```powershell
$env:CRON_SECRET="YOUR_LONG_RANDOM_CRON_SECRET"
npm run free-staging:deploy -- -ProjectRef "YOUR_PROJECT_REF"
```

## Final gates

These gates are expected to pass after real Supabase values are available:

```bash
npm run doctor:staging-env -- --require-live --free-mode
npm run smoke:supabase
npm run smoke:live-readiness
```

These gates already pass without external credentials:

```bash
npm run package1:preflight
npm run doctor:final-readiness
npm run smoke:public-preview
```

## What is completed

- PWA installable mobile/web app
- GitHub Pages public preview
- Supabase schema and Edge Function readiness
- Free staging helper scripts
- Rule-based AI Check fallback
- AI governance guardrails
- No guaranteed-profit language
- No automatic trading
- Persistent rate limits for high-risk user functions
- Smoke tests and readiness doctors

## What remains external

These are not code blockers; they require owner account access:

- Create Supabase Free project
- Create Supabase Auth test user
- Copy Supabase project URL and anon key
- Run `supabase db push`
- Run `supabase/seed.sql` in SQL editor if baseline data is not present
- Set Supabase Edge secrets
- Deploy Supabase Edge Functions
- Add GitHub Actions secrets if automated staging workflows are desired

## Upgrade path

When paid or trial OpenAI API is available:

```powershell
$env:JASIC_AI_MODE="openai"
$env:OPENAI_API_KEY="YOUR_OPENAI_KEY"
$env:OPENAI_MODEL="gpt-5.4-mini"
$env:CRON_SECRET="YOUR_LONG_RANDOM_CRON_SECRET"
npm run supabase:set:secrets
```

Until then, the staging app remains usable through `rule_based` mode.
