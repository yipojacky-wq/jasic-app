# JASIC Staging Launch Checklist

Date: 2026-06-28

Use this checklist when you are ready to connect the app to a real Supabase staging project and let other people test the live-mode prototype.

Before starting, fill out:

```text
docs/STAGING_VALUES_WORKSHEET.md
```

## 0. What this checklist launches

This launches a staging version of the current JASIC MVP:

- Macro Dashboard backed by Supabase `market-summary`
- Discovery Pool backed by `discovery-latest`
- Settings / Data Health backed by `data-health`
- Data Source Registry exposed through `data-health`
- Public web preview still deployed through GitHub Pages

It does not launch:

- Automatic trading
- Guaranteed-profit recommendations
- Paid course, cart, checkout, or sales pages
- Production-grade licensed market data

## 1. Required accounts and values

Prepare these values before starting:

| Item | Where to get it | Safe to commit? |
| --- | --- | --- |
| Supabase project ref | Supabase project settings | No |
| Supabase project URL | Supabase API settings | Yes, only as public client URL |
| Supabase anon key | Supabase API settings | Yes, public anon key only |
| Supabase service-role key | Supabase API settings | Never |
| OpenAI API key | OpenAI platform | Never |
| Cron secret | Generate locally | Never |
| Short-lived user access token | Supabase auth session | Never |

Recommended cron secret:

```powershell
[guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")
```

## 2. Local preflight

From the project root:

```bash
npm install
npm run package1:preflight
```

If you want to run each check separately:

```bash
npm run doctor:data-sources
npm run doctor:live-readiness
npm run doctor:supabase
npm run typecheck
npm run typecheck:edge
npm test
npm run build:web:github-pages
```

Expected result: every command passes.

## 3. Link Supabase staging

Login and link the project:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

## 4. Push database schema

```bash
npx supabase db push
```

This applies migrations for:

- user profile / auth support
- stocks
- market score snapshots
- macro indicators
- discovery runs and candidates
- data sources
- ingestion runs
- stock daily prices
- institutional flows
- stock features
- alerts
- reports
- privacy / export / deletion
- portfolio positions
- AI Check audit tables

## 5. Seed staging baseline data

Use the Supabase SQL editor to run:

```text
supabase/seed.sql
```

The seed includes provisional staging rows for:

- stocks
- five macro indicator definitions
- five macro indicator values
- one market score snapshot
- stock score snapshots
- one completed discovery run
- discovery candidates

This lets live-mode Dashboard and Discovery render before scheduled ingestion runs.

## 6. Set Supabase Edge Function secrets

PowerShell:

```powershell
$env:OPENAI_API_KEY="YOUR_OPENAI_KEY"
$env:OPENAI_MODEL="gpt-5.4-mini"
$env:CRON_SECRET="YOUR_LONG_RANDOM_CRON_SECRET"
npm run supabase:set:secrets
```

Dry run first if desired:

```powershell
npm run supabase:set:secrets -- -DryRun
```

Never put `OPENAI_API_KEY`, `CRON_SECRET`, or the Supabase service-role key in `EXPO_PUBLIC_*`.

## 7. Deploy Edge Functions

PowerShell:

```powershell
npm run supabase:deploy:functions
```

Dry run first if desired:

```powershell
npm run supabase:deploy:functions -- -DryRun
```

## 8. Configure local live mode

Create `.env.local`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
EXPO_PUBLIC_DEMO_MODE=false
```

Do not add `.env.local` to Git.

## 9. Endpoint smoke test

This verifies deployed function endpoints are reachable:

```bash
npm run smoke:supabase
```

## 10. Live data shape smoke test

This verifies POST response shape for the core live screens and AI governance metadata:

```bash
npm run smoke:live-readiness
```

For the authenticated `data-health` and `ai-check` checks, set a short-lived user access token:

```powershell
$env:JASIC_STAGING_ACCESS_TOKEN="YOUR_USER_ACCESS_TOKEN"
npm run smoke:live-readiness
```

Do not use the Supabase service-role key here.

When `JASIC_STAGING_ACCESS_TOKEN` is present, this also validates that `ai-check`
returns:

- action / conclusion / reasons / risks / suggestions / confidence
- `rule_version`
- `model_identifier`
- `prompt_version`
- `response_schema_version`

## 11. Run local live-mode web app

```bash
npm run prototype:web
```

Open:

```text
http://localhost:8081
```

Validate:

- Dashboard loads Market Score and five macro indicators.
- Discovery shows candidates.
- Settings shows Data Health and Source Registry.
- AI Check still shows no guaranteed-profit language.
- No automatic trading feature exists.

## 12. GitHub Actions secrets

In GitHub:

```text
Repo -> Settings -> Secrets and variables -> Actions
```

Add:

```text
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
CRON_SECRET=YOUR_LONG_RANDOM_CRON_SECRET
JASIC_STAGING_ACCESS_TOKEN=YOUR_SHORT_LIVED_USER_ACCESS_TOKEN
```

These are used by:

- `.github/workflows/market-data.yml`
- `.github/workflows/staging-smoke.yml`

## 13. Manual market-data workflow test

In GitHub Actions, run:

```text
JASIC Market Data Pipeline -> Run workflow
```

Expected sequence:

1. `market-data-ingest`
2. `score-calculate`
3. `alert-evaluate`
4. `report-generate`

Then run locally again:

```bash
npm run smoke:live-readiness
```

## 13.1 Manual staging smoke workflow test

In GitHub Actions, run:

```text
JASIC Staging Smoke -> Run workflow
```

Expected sequence:

1. Package 1 preflight
2. `smoke:supabase`
3. `smoke:live-readiness`

## 14. Public preview check

The public web preview is still:

```text
https://yipojacky-wq.github.io/jasic-app/
```

If it shows 404, set GitHub Pages:

```text
Repo -> Settings -> Pages -> Deploy from branch -> gh-pages / root
```

## 15. Package 1 done criteria

Package 1 is complete when:

- Local preflight passes.
- Supabase migrations are applied.
- Seed baseline is inserted.
- Edge Function secrets are set.
- Edge Functions are deployed.
- `npm run smoke:supabase` passes.
- `npm run smoke:live-readiness` passes.
- Local live mode renders Dashboard, Discovery, and Data Health.
- GitHub Actions CI passes.
- GitHub Pages preview remains deployable.
