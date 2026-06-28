# JASIC Staging Values Worksheet

Date: 2026-06-28

Use this worksheet before running `docs/STAGING_LAUNCH_CHECKLIST.md`.

Do not commit filled-in secrets. Keep completed copies outside the repo or in a password manager.

## 1. Public client values

These values can be used in `.env.local` for local live-mode testing. They are public client values, but still avoid posting them casually.

| Field | Value |
| --- | --- |
| Supabase project ref | `TODO` |
| Supabase project URL | `https://TODO.supabase.co` |
| Supabase anon key | `TODO` |

Local `.env.local` template:

```env
EXPO_PUBLIC_SUPABASE_URL=https://TODO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=TODO
EXPO_PUBLIC_DEMO_MODE=false
```

## 2. Private secrets

Never commit these values.

| Field | Value | Where used |
| --- | --- | --- |
| Supabase service-role key | `NEVER_PASTE_IN_REPO` | Supabase backend only; do not use in app env |
| OpenAI API key | `TODO` | Supabase Edge Function secret |
| OpenAI model | `gpt-5.4-mini` | Supabase Edge Function secret |
| `CRON_SECRET` | `TODO` | Supabase Edge Function secret + GitHub Actions secret |
| Short-lived user access token | `TODO` | Local `smoke:live-readiness` only |

Generate a cron secret in PowerShell:

```powershell
[guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")
```

Set Supabase Edge Function secrets:

```powershell
$env:OPENAI_API_KEY="TODO"
$env:OPENAI_MODEL="gpt-5.4-mini"
$env:CRON_SECRET="TODO"
npm run supabase:set:secrets
```

## 3. GitHub Actions secrets

Add these in:

```text
GitHub repo -> Settings -> Secrets and variables -> Actions
```

| Secret name | Value |
| --- | --- |
| `SUPABASE_URL` | `https://TODO.supabase.co` |
| `CRON_SECRET` | `TODO` |

These support `.github/workflows/market-data.yml`.

## 4. Validation commands

Before deploying:

```bash
npm run doctor:data-sources
npm run doctor:live-readiness
npm run doctor:supabase
```

After deploying:

```bash
npm run smoke:supabase
npm run smoke:live-readiness
```

For authenticated `data-health` validation:

```powershell
$env:JASIC_STAGING_ACCESS_TOKEN="TODO"
npm run smoke:live-readiness
```

## 5. Safety rules

- Never put the Supabase service-role key in `.env.local`.
- Never put OpenAI API keys in `EXPO_PUBLIC_*`.
- Never commit `.env.local`.
- Never commit .env.local.
- Never use service-role key as `JASIC_STAGING_ACCESS_TOKEN`.
- Use short-lived user access tokens for authenticated smoke tests.
- Keep production and staging secrets separate.
