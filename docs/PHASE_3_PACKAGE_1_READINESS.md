# Phase 3 Package 1 Readiness Gate

Date: 2026-06-28

Package 1 focuses on getting JASIC from demo mode toward a Supabase staging app that can show the core live screens:

- Macro Dashboard
- Discovery Pool
- Settings / Data Health
- Data Source Registry

For the exact launch sequence, use:

```text
docs/STAGING_LAUNCH_CHECKLIST.md
```

For the engineering handoff summary, use:

```text
docs/PHASE_3_PACKAGE_1_HANDOFF.md
```

For the values you need to collect before launch, use:

```text
docs/STAGING_VALUES_WORKSHEET.md
```

## Local required checks

Run these before pushing changes that affect data ingestion, staging seed, Edge Functions, or core live-mode screens:

```bash
npm run package1:preflight
```

Or run the checks individually:

```bash
npm run doctor:data-sources
npm run doctor:live-readiness
npm run doctor:supabase
npm run typecheck
npm run typecheck:edge
npm test
npm run build:web:github-pages
```

## CI gate

`.github/workflows/ci.yml` runs:

- `npm run doctor:data-sources`
- `npm run doctor:live-readiness`
- `npm run doctor:supabase`
- `npm run typecheck`
- `npm run typecheck:edge`
- `npm test`
- `npm run build:web`

`.github/workflows/pages.yml` runs data-source and live-readiness doctors before publishing the web preview.

`.github/workflows/staging-smoke.yml` can be manually triggered after Supabase staging secrets are configured.

## Staging POST smoke

After a real Supabase staging project is linked, migrated, seeded, and deployed:

```bash
npm run smoke:supabase
npm run smoke:live-readiness
```

`smoke:live-readiness` validates POST response shape for:

- `market-summary`
- `discovery-latest`
- `data-health`
- `ai-check` governance metadata when `JASIC_STAGING_ACCESS_TOKEN` is provided

For authenticated `data-health` and `ai-check`, provide a short-lived Supabase user access token:

```powershell
$env:JASIC_STAGING_ACCESS_TOKEN="YOUR_USER_ACCESS_TOKEN"
npm run smoke:live-readiness
```

Never use a service-role key for `JASIC_STAGING_ACCESS_TOKEN`.

## Remaining Package 1 handoff blocker

The codebase is ready for staging validation, but the actual cloud-side validation still needs:

1. Supabase project ref.
2. Supabase project URL.
3. Supabase anon key.
4. OpenAI API key.
5. Cron secret.
6. A short-lived user access token for authenticated smoke testing.
