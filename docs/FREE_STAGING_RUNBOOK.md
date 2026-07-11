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

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
EXPO_PUBLIC_DEMO_MODE=false
JASIC_AI_MODE=rule_based
JASIC_STAGING_ACCESS_TOKEN=YOUR_SHORT_LIVED_USER_TOKEN
```

Do not commit `.env.local`.

## Supabase Edge secrets

PowerShell:

```powershell
$env:JASIC_AI_MODE="rule_based"
$env:CRON_SECRET="YOUR_LONG_RANDOM_CRON_SECRET"
npm run supabase:set:secrets
```

This skips `OPENAI_API_KEY` and uses JASIC rule-based AI Check output.

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

