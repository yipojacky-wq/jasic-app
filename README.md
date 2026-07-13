# JASIC Stock Analysis App

JASIC 是一套股票分析工具型 App，目標是提供：

- Macro Dashboard：五大總經指標、Market Score、市場燈號、AI/規則式市場摘要
- Three-Layer Stock Funnel：市場環境、法人/主力/OI、技術面/風險三層漏斗，輸出 Top 20 候選股
- AI Check：依股票代號、成本、張數、期間、風險偏好輸出加碼/續抱/觀望/減碼/停損建議
- Personalized Analysis：Watchlist、Score Change、Risk Alert、AI 個股摘要
- Trend Reports：Daily、Weekly、War Room、Risk Alert 報告

重要限制：

- 不做自動下單
- 不保證獲利
- 不做課程銷售、購物車、募資或付款功能

## Public PWA Preview

目前可直接用網址預覽：

[https://yipojacky-wq.github.io/jasic-app/](https://yipojacky-wq.github.io/jasic-app/)

手機可用瀏覽器開啟並「加入主畫面」，以 PWA 方式操作。

示範操作手冊：

[docs/DEMO_OPERATION_MANUAL.md](docs/DEMO_OPERATION_MANUAL.md)

每日自動更新與報告排程：

[docs/DAILY_AUTOMATION_RUNBOOK.md](docs/DAILY_AUTOMATION_RUNBOOK.md)

GitHub Actions Secrets 設定：

[docs/GITHUB_ACTIONS_SECRETS_SETUP.md](docs/GITHUB_ACTIONS_SECRETS_SETUP.md)

## Tech Stack

- React Native + Expo + TypeScript
- Expo Web / PWA
- Supabase Database / Auth / Edge Functions
- React Query
- Zustand
- OpenAI API optional；免費 staging 預設使用 `rule_based`

## Local Development

```powershell
npm install
npm run web
```

Web build：

```powershell
npm run build:web:github-pages
```

完整 preflight：

```powershell
npm run package1:preflight
```

## Staging Backend Connection

正式 staging 後端接線建議使用整合指令：

```powershell
$env:CRON_SECRET="YOUR_LONG_RANDOM_CRON_SECRET"
npm run staging:connect -- `
  -ProjectRef "YOUR_PROJECT_REF" `
  -SupabaseUrl "https://YOUR_PROJECT.supabase.co" `
  -SupabaseAnonKey "YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY" `
  -ForceEnv
```

這會依序完成：

1. 建立本機 `.env.local`
2. 驗證 live-mode staging env
3. 執行完整 preflight
4. 連結 Supabase project
5. 推送 database migrations
6. 設定 Edge Function secrets
7. 部署 Edge Functions
8. 執行 smoke tests

先只測本機接線、不部署雲端：

```powershell
$env:CRON_SECRET="YOUR_LONG_RANDOM_CRON_SECRET"
npm run staging:connect -- `
  -ProjectRef "YOUR_PROJECT_REF" `
  -SupabaseUrl "https://YOUR_PROJECT.supabase.co" `
  -SupabaseAnonKey "YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY" `
  -ForceEnv `
  -SkipCloudDeploy
```

## Nearly-Free Staging

免費 staging 預設：

```env
JASIC_AI_MODE=rule_based
EXPO_PUBLIC_DEMO_MODE=false
```

產生 `CRON_SECRET`：

```powershell
npm run free-staging:secret -- --env
```

建立 `.env.local`：

```powershell
npm run free-staging:env -- `
  -SupabaseUrl "https://YOUR_PROJECT.supabase.co" `
  -SupabaseAnonKey "YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY" `
  -StagingAccessToken "YOUR_SHORT_LIVED_USER_TOKEN"
```

分段部署免費 staging：

```powershell
$env:CRON_SECRET="YOUR_LONG_RANDOM_CRON_SECRET"
npm run free-staging:deploy -- -ProjectRef "YOUR_PROJECT_REF"
```

## Quality Gates

```powershell
npm run doctor:final-readiness
npm run doctor:staging-env
npm run doctor:staging-env -- --require-live --free-mode
npm run doctor:live-readiness
npm run smoke:public-preview
npm run smoke:supabase
npm run smoke:live-readiness
npm run typecheck
npm run typecheck:edge
npm test
npm run build:web:github-pages
```

## Project Structure

```text
src/                  App UI, screens, hooks, services
supabase/functions/   Supabase Edge Functions
supabase/migrations/  Database migrations
supabase/seed.sql     Staging seed data
scripts/              Doctors, smoke tests, deployment helpers
docs/                 Runbooks and handoff documents
.github/workflows/    CI, GitHub Pages, staging smoke workflows
```

## Important Documents

- `docs/SUPABASE_STAGING_RUNBOOK.md`
- `docs/FREE_STAGING_RUNBOOK.md`
- `docs/FINAL_STAGE_COMPLETION_REPORT.md`
- `docs/PWA_RUNBOOK.md`
- `MASTER_HANDOVER.md`

## Required Owner-Supplied Values

To complete real cloud staging deployment, prepare:

```text
Supabase project ref
Supabase project URL
Supabase public anon key or publishable key
CRON_SECRET
```

Optional for authenticated smoke tests:

```text
Test user email/password, or short-lived JASIC_STAGING_ACCESS_TOKEN
```

Never commit:

```text
.env.local
Supabase service-role key
OpenAI API key
```

## Current Status

Engineering readiness is complete for public PWA preview and Supabase staging connection. Real cloud deployment requires the Supabase project values listed above.
