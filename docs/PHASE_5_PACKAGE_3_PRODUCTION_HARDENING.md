# Phase 5 Package 3: Mobile Preview / Production Hardening

Date: 2026-07-11

Status: In progress.

Package 3 focuses on Mobile preview and Production hardening so the JASIC app is safer to open on web and mobile preview builds before real staging users test it.

## Completed in this slice

- Added root-level Error Boundary:

```text
src/components/ErrorBoundary.tsx
```

- Wrapped the app root in `ErrorBoundary`.
- Added a safe recovery screen that:
  - avoids full-app white screen failures
  - lets the user retry rendering
  - repeats the no-profit-guarantee and no-auto-trading boundary

- Added production hardening doctor:

```bash
npm run doctor:production-hardening
```

The doctor checks:

- Expo mobile scheme and app identifiers
- Error Boundary wiring
- deep link test coverage
- share/export test coverage
- live smoke script availability
- deployment doctor availability
- mobile preview checklist
- E2E smoke checklist
- Edge abuse-control notes
- shared Edge rate-limit policy skeleton

## Added checklists

```text
docs/MOBILE_PREVIEW_CHECKLIST.md
docs/E2E_SMOKE_CHECKLIST.md
docs/EDGE_ABUSE_CONTROL_NOTES.md
```

## Added rate-limit skeleton

```text
supabase/functions/_shared/edgeRateLimit.ts
tests/edge-rate-limit.test.ts
```

This defines first-pass per-user policy targets for AI Check, report generation, user data export and account deletion. It does not yet persist counters in Supabase; that remains an open-beta hardening task.

## Remaining Package 3 work

1. Run real mobile preview validation when app store / EAS credentials are available.
2. Implement persistent Edge Function rate limiting before open beta.
3. Run real Supabase staging smoke with `JASIC_STAGING_ACCESS_TOKEN`.

## Safety reminder

JASIC remains a research and risk-checking tool only:

- no automatic trading
- no guaranteed profit
- no payment or course-sales flow
