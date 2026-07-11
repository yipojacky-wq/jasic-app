# JASIC Final 3 Phases Completion Plan

Date: 2026-07-11

This document is the clean handoff map for the final three phases needed to move JASIC from a validated prototype to a usable staging app that other people can open and test.

## Current status

Engineering readiness is complete for the local prototype and GitHub-hosted web preview path.

Already verified:

- Web build works.
- TypeScript app typecheck passes.
- Supabase Edge Function typecheck passes.
- Unit and contract tests pass.
- Deployment doctor passes.
- Supabase staging readiness doctor passes.
- AI governance doctor passes.
- Score governance doctor passes.
- Production hardening doctor passes.
- High-risk user functions have persistent rate-limit protection.

Still requiring external environment work:

- Supabase staging project credentials.
- OpenAI API key.
- Supabase Edge Function secrets.
- GitHub Actions secrets.
- GitHub Pages setting confirmation.
- Expo / EAS account login for mobile preview builds.

## Phase A — Supabase staging live backend

Goal: connect the app to a real Supabase staging project and prove live-mode APIs work.

Required inputs from owner:

- Supabase project ref.
- Supabase project URL.
- Supabase public anon key.
- Supabase service-role key, used only by Supabase CLI / function secret setup, never committed.
- OpenAI API key.
- CRON_SECRET.
- Short-lived test user access token for authenticated smoke tests.

Execution:

```bash
npm run package1:preflight
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
npm run supabase:set:secrets
npm run supabase:deploy:functions
npm run smoke:supabase
npm run smoke:live-readiness
```

Done criteria:

- Migrations apply successfully.
- `supabase/seed.sql` baseline data is inserted.
- Edge Functions deploy successfully.
- `smoke:supabase` passes.
- `smoke:live-readiness` passes with `JASIC_STAGING_ACCESS_TOKEN`.
- AI Check response includes governance metadata and no guaranteed-profit / auto-trading language.

## Phase B — Public web preview URL

Goal: give other people a URL they can open.

Primary URL:

```text
https://yipojacky-wq.github.io/jasic-app/
```

Execution:

```bash
npm run doctor:deploy
npm run build:web:github-pages
npm run smoke:public-preview
```

GitHub setting:

```text
Repository -> Settings -> Pages -> Deploy from a branch -> gh-pages / root
```

Done criteria:

- GitHub Pages deploy completes.
- Public URL opens without 404.
- `smoke:public-preview` passes.
- Dashboard, Discovery, Stock War Room, AI Check, Watchlist, Reports, and Settings render.
- Demo mode remains safe if staging credentials are not enabled.
- Live mode is enabled only when valid Supabase public values are provided.

## Phase C — Mobile preview and real-device validation

Goal: make the mobile app installable/testable through Expo preview builds.

Required inputs from owner:

- Expo account / EAS login.
- Apple Developer account if iOS internal distribution is required.
- Google Play Console account if Android internal distribution is required.
- Decision: Expo Go preview first, or EAS internal build first.

Execution:

```bash
npm run doctor:production-hardening
npm run typecheck
npm test
npx eas build --profile preview --platform android
npx eas build --profile preview --platform ios
```

Done criteria:

- Android preview build is installable.
- iOS preview build is installable, if Apple credentials are available.
- Deep links work:
  - `jasic://stock/2330`
  - `jasic://ai-check/2330`
- Share/export surfaces work.
- Error Boundary fallback works.
- AI Check still refuses guaranteed profit and automatic trading.

## Final production-readiness definition

JASIC can be considered operational staging-ready when all commands below pass against real staging infrastructure:

```bash
npm run doctor:final-readiness
npm run package1:preflight
npm run smoke:public-preview
npm run smoke:supabase
npm run smoke:live-readiness
```

Production launch still requires licensed/approved data-source policy, legal review, privacy/terms review, and monitoring/SLA decisions.
