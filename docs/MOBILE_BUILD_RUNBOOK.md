# JASIC Mobile Build Runbook

Date: 2026-07-11

This runbook is for completing the mobile preview before the final Supabase / OpenAI live-backend stage.

## Current mobile status

The app is already configured as an Expo / React Native app with:

- Expo scheme: `jasic`
- iOS bundle identifier: `com.jasic.stockintelligence`
- Android package: `com.jasic.stockintelligence`
- Portrait orientation
- Internal EAS preview profile
- Android APK preview output
- Deep-link parsing for:
  - `jasic://stock/2330`
  - `jasic://ai-check/2330`
- Share/export surfaces
- Error Boundary fallback
- Safety language forbidding guaranteed profit and automatic trading

## 1. Local mobile readiness gate

Run:

```bash
npm run doctor:mobile-preview
npm run package1:preflight
```

Expected result:

- Both commands pass.
- `doctor:mobile-preview` confirms app identity, EAS preview config, assets, deep links, share tests, Error Boundary, and mobile checklist.

## 2. Expo account requirement

Before building installable mobile previews, sign in to Expo:

```bash
npx eas login
```

If EAS asks to initialize a project, follow the prompt and keep the generated project metadata committed only if it is safe and expected.

## 3. Android preview build

Recommended first mobile artifact:

```bash
npx eas build --profile preview --platform android
```

Expected output:

- An installable Android APK link.
- Share this APK only with trusted testers.

## 4. iOS preview build

For iOS internal distribution:

```bash
npx eas build --profile preview --platform ios
```

Required:

- Apple Developer account.
- Device registration or an accepted internal distribution path.

If Apple credentials are not ready, complete Android first and defer iOS.

## 5. Phone validation checklist

Install the preview and verify:

1. Dashboard opens.
2. Discovery Pool opens and shows Top 20-style candidates.
3. Stock War Room opens for `2330`.
4. AI Check opens and accepts valid input.
5. Watchlist opens.
6. Reports opens.
7. Settings / Data Health opens.
8. `jasic://stock/2330` routes to Stock War Room.
9. `jasic://ai-check/2330` routes to AI Check.
10. Share/export actions open the native share sheet.
11. Safety language remains visible:
    - no guaranteed profit
    - no automatic trading
    - research and risk-checking only

## 6. Demo mode vs live mode

For mobile preview before staging backend:

```env
EXPO_PUBLIC_DEMO_MODE=true
```

For mobile preview after staging backend:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
EXPO_PUBLIC_DEMO_MODE=false
```

Never include these in a mobile public environment:

- Supabase service-role key
- OpenAI API key
- CRON_SECRET

## Done criteria for mobile-first completion

Mobile-first completion is achieved when:

- `npm run doctor:mobile-preview` passes.
- `npm run package1:preflight` passes.
- Android preview build is produced by EAS.
- iOS preview build is either produced or explicitly deferred until Apple credentials are available.
- Real-device checklist is completed.

