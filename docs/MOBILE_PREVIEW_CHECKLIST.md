# JASIC Mobile Preview Checklist

Date: 2026-07-11

Use this checklist before sharing an Expo / EAS mobile preview build.

## Required local checks

```bash
npm run package1:preflight
npm run doctor:production-hardening
```

## App identity

- Expo scheme: `jasic`
- iOS bundle identifier: `com.jasic.stockintelligence`
- Android package: `com.jasic.stockintelligence`
- Orientation: portrait
- App mode is clearly visible: demo data mode or live data mode

## Mobile routes to verify

- `jasic://stock/2330`
- `jasic://ai-check/2330`

Expected behavior:

- stock deep link opens Stock War Room
- AI Check deep link opens AI Check with the symbol filled
- malformed stock symbols are rejected safely

## Screens to open on a phone-sized viewport

1. Dashboard
2. Discovery Pool
3. Stock War Room
4. AI Check
5. Watchlist
6. Reports
7. Settings / Data Health

## Safety copy to verify

- no guaranteed profit
- no automatic trading
- research and risk-checking only

## Before external sharing

- Do not include Supabase service-role key in any mobile build.
- Do not include OpenAI API key in any `EXPO_PUBLIC_*` variable.
- Use short-lived test users for staging verification.
- Confirm GitHub Pages / web preview is green before sending mobile preview links.
