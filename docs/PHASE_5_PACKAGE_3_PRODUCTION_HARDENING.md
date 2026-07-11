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

## Remaining Package 3 work

1. Add mobile preview build checklist for EAS / Expo preview.
2. Add rate-limit and abuse-control notes for Edge Functions.
3. Add e2e smoke checklist for Dashboard, Discovery, War Room, AI Check, Watchlist, Reports and Settings.
4. Run real mobile preview validation when app store / EAS credentials are available.

## Safety reminder

JASIC remains a research and risk-checking tool only:

- no automatic trading
- no guaranteed profit
- no payment or course-sales flow
