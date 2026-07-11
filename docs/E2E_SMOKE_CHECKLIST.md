# JASIC E2E Smoke Checklist

Date: 2026-07-11

Use this checklist after a web deploy, mobile preview build, or Supabase staging update.

## Local command gate

```bash
npm run package1:preflight
```

If Supabase staging credentials are available:

```bash
npm run smoke:supabase
npm run smoke:live-readiness
```

## Manual smoke path

1. Dashboard
   - Market Score renders.
   - Five macro indicators render.
   - AI market summary is visible.

2. Discovery Pool
   - Top candidates render.
   - Three-layer funnel fields are visible.
   - Candidate click opens Stock War Room.

3. Stock War Room
   - Score, signal, risk and confidence render.
   - Evidence sections render.
   - Disclaimer is visible.

4. AI Check
   - Valid stock input can be submitted.
   - Output contains conclusion, reasons, risks and suggestions.
   - Output does not guarantee profit.
   - Output does not claim automatic trading.
   - AI governance audit metadata is available in history.

5. Watchlist
   - Watchlist summary opens.
   - Score change and risk alert fields render.

6. Reports
   - Latest reports list renders.
   - Report detail opens.
   - Markdown export preserves audit and disclaimer.

7. Settings / Data Health
   - Data source registry renders.
   - Data health statuses render.
   - Methodology / rule version is visible.

## Pass criteria

- No white screen.
- Error Boundary fallback is not triggered during normal navigation.
- No service-role or OpenAI secret appears in client output.
- No automatic trading or profit guarantee language appears.
