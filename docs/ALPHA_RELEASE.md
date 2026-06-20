# JASIC Alpha Release Checklist

## Required external accounts

- GitHub repository
- Supabase project
- OpenAI API project
- Expo account / EAS project
- Apple Developer account for iOS distribution
- Google Play Console account for Android production distribution

## EAS setup

1. Create and link the EAS project:

```bash
npx eas-cli init
```

This command writes the actual EAS project ID into the Expo configuration. The repository intentionally does not contain a fake placeholder project ID.

2. Confirm identifiers:

- iOS: `com.jasic.stockintelligence`
- Android: `com.jasic.stockintelligence`

These identifiers must be changed before the first store build if the organization uses another reverse-domain name. Store identifiers cannot be casually changed after release.

3. Configure EAS environment variables/secrets for Preview and Production:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_DEMO_MODE=false`

Never place OpenAI or Supabase service-role secrets in EAS client variables.

## Build commands

```bash
npx eas-cli build --profile preview --platform android
npx eas-cli build --profile preview --platform ios
npx eas-cli build --profile production --platform all
```

## Alpha acceptance gates

- Supabase migrations applied successfully to a clean project.
- At least 20 valid trading sessions loaded.
- All Edge Functions deployed with required secrets.
- GitHub scheduled pipeline completes successfully.
- Data Health page shows no stale required source.
- AI Check refuses aggressive conclusions on stale or low-confidence data.
- Account export tested on Web and one mobile platform.
- Account deletion tested with a disposable account.
- Report search, bookmark persistence and Markdown export tested on Web and one mobile platform.
- New and terms-outdated accounts are blocked by onboarding until the current terms are explicitly accepted.
- Privacy and disclaimer text reviewed by qualified counsel.
- No automatic order placement or guaranteed-profit wording exists.
