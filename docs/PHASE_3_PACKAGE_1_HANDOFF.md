# Phase 3 Package 1 Handoff

Date: 2026-06-28

Status: Engineering complete / Cloud validation pending.

Package 1 turns the JASIC prototype into a staging-ready app skeleton that can be opened as a web app and can later connect to Supabase live data for the first operational screens.

## Package goal

Prepare the app for the shortest practical path from local/demo mode to a shareable staging app:

- Macro Dashboard can read staged market score and macro indicators.
- Discovery Pool can read the latest completed three-layer funnel run.
- Settings / Data Health can expose data source readiness and ingestion state.
- GitHub and local checks can detect missing staging wiring before deployment.

## Completed

- Shared data source registry added for TWSE / TPEx / macro / future licensed adapters.
- `data-health` Edge Function exposes `sourceRegistry` and `sourceRegistrySummary`.
- Settings screen includes a source registry panel.
- Data-source readiness doctor added with official-source and pending-source checks.
- Live readiness doctor added for schema, seed, Edge Functions, API calls, docs, and staging workflow.
- Staging seed now contains provisional dashboard, score, and discovery baseline rows.
- Supabase staging smoke test added.
- Live POST smoke test added for `market-summary`, `discovery-latest`, and `data-health`.
- One-command Package 1 preflight added:

```bash
npm run package1:preflight
```

- CI and GitHub Pages workflows now run readiness gates before build/deploy.
- Manual GitHub staging smoke workflow added:

```text
.github/workflows/staging-smoke.yml
```

- Staging launch checklist and staging values worksheet added.

## Cloud validation still pending

Package 1 is blocked only by external staging values and cloud-side setup.

Required values:

1. Supabase project ref.
2. Supabase project URL.
3. Supabase anon key.
4. OpenAI API key.
5. `CRON_SECRET`.
6. A short-lived Supabase user access token for authenticated smoke testing.

Use:

```text
docs/STAGING_VALUES_WORKSHEET.md
docs/STAGING_LAUNCH_CHECKLIST.md
```

## Local verification commands

Run before handing the package to another developer or before pushing staging-related changes:

```bash
npm run package1:preflight
npm run doctor:deploy
```

After a real Supabase staging project is configured:

```bash
npm run smoke:supabase
npm run smoke:live-readiness
```

For authenticated `data-health` smoke testing:

```powershell
$env:JASIC_STAGING_ACCESS_TOKEN="YOUR_USER_ACCESS_TOKEN"
npm run smoke:live-readiness
```

Never use a service-role key as `JASIC_STAGING_ACCESS_TOKEN`.

## GitHub workflow coverage

- `ci.yml`: source registry, live readiness, Supabase doctor, typecheck, tests, build.
- `pages.yml`: source registry and live readiness before GitHub Pages deploy.
- `staging-smoke.yml`: manual staging preflight and Supabase smoke validation.
- `market-data-pipeline.yml`: scheduled/manual ingestion pipeline workflow.

## Safety boundaries

- No automatic trading.
- No guaranteed profit language.
- No payment, cart, course, or sales-site workflow.
- No Supabase service-role key in `.env.local`.
- No OpenAI API key in any `EXPO_PUBLIC_*` variable.
- Staging seed data is provisional/demo baseline only, not live investment data.

## Criteria to move to Package 2

Package 1 can be considered closed when:

- `npm run package1:preflight` passes locally and in CI.
- Supabase project is linked.
- Database migrations are pushed.
- Staging seed is inserted.
- Required Edge Functions are deployed.
- GitHub repository secrets are configured.
- `npm run smoke:supabase` passes.
- `npm run smoke:live-readiness` passes.
- Dashboard, Discovery Pool, and Settings / Data Health render against staging.

## Recommended Package 2 scope

Package 2 should focus on hardening the JASIC Score and AI Check layer:

- Score rule versioning.
- AI prompt versioning.
- AI response schema validation.
- AI Check audit trail.
- Risk and compliance wording guardrails.
- Clear no-profit-guarantee and no-auto-trading UX copy.
