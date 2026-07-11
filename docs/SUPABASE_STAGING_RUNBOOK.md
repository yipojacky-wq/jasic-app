# JASIC Supabase Staging Runbook

最後更新：2026-07-12  
狀態：工程接線已完成；正式雲端部署需填入 Supabase Free 專案資料。

本文件說明如何把 JASIC App 從 demo/PWA 預覽模式，接到真正的 Supabase staging 後端。此流程採用「幾乎全免費」方案：AI Check 預設使用 `rule_based`，不需要 OpenAI API key。

## 1. 需要先準備的資料

請在 Supabase 建立一個 Free 專案，例如：

```text
jasic-staging
```

接著準備下列值：

```text
Project ref
Project URL，例如 https://YOUR_PROJECT.supabase.co
Public anon key
CRON_SECRET，至少 32 字元
```

可用專案內建指令產生 `CRON_SECRET`：

```powershell
npm run free-staging:secret
```

選填：

```text
JASIC_STAGING_ACCESS_TOKEN
```

這是 Supabase 測試使用者的短效 access token，可讓 smoke test 驗證需要登入的 API，例如 `data-health` 與 `ai-check`。

請勿提供或提交：

```text
Supabase service-role key
OpenAI API key 放在 EXPO_PUBLIC_* 變數
任何 .env.local 到 Git
```

## 2. 一鍵正式 staging 接線

建議使用新的整合指令：

```powershell
$env:CRON_SECRET="YOUR_LONG_RANDOM_CRON_SECRET"
npm run staging:connect -- `
  -ProjectRef "YOUR_PROJECT_REF" `
  -SupabaseUrl "https://YOUR_PROJECT.supabase.co" `
  -SupabaseAnonKey "YOUR_PUBLIC_ANON_KEY" `
  -ForceEnv
```

這個指令會依序完成：

1. 建立或覆寫本機 `.env.local`
2. 驗證 live-mode staging 環境變數
3. 執行完整 preflight
4. 連結 Supabase 專案
5. 推送 database migrations
6. 設定 Edge Function secrets
7. 部署所有 Supabase Edge Functions
8. 執行 endpoint smoke test
9. 執行 live POST response smoke test

## 3. 先只測本機接線，不部署雲端

如果你想先確認資料格式與環境變數，不推 DB、不部署 functions：

```powershell
$env:CRON_SECRET="YOUR_LONG_RANDOM_CRON_SECRET"
npm run staging:connect -- `
  -ProjectRef "YOUR_PROJECT_REF" `
  -SupabaseUrl "https://YOUR_PROJECT.supabase.co" `
  -SupabaseAnonKey "YOUR_PUBLIC_ANON_KEY" `
  -ForceEnv `
  -SkipCloudDeploy
```

## 4. OpenAI 版 staging

目前免費 staging 預設：

```text
JASIC_AI_MODE=rule_based
```

若未來要啟用 OpenAI：

```powershell
$env:CRON_SECRET="YOUR_LONG_RANDOM_CRON_SECRET"
$env:OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
$env:OPENAI_MODEL="gpt-5.4-mini"
npm run staging:connect -- `
  -ProjectRef "YOUR_PROJECT_REF" `
  -SupabaseUrl "https://YOUR_PROJECT.supabase.co" `
  -SupabaseAnonKey "YOUR_PUBLIC_ANON_KEY" `
  -AiMode openai `
  -ForceEnv
```

OpenAI key 只會設定為 Supabase Edge secret，不會進入 `EXPO_PUBLIC_*`。

## 5. 手動分段指令

若要分段執行，可使用：

```powershell
npm run free-staging:env -- -SupabaseUrl "https://YOUR_PROJECT.supabase.co" -SupabaseAnonKey "YOUR_PUBLIC_ANON_KEY" -Force
npm run doctor:staging-env -- --require-live --free-mode
npm run package1:preflight
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
npm run supabase:set:secrets
npm run supabase:deploy:functions
npm run smoke:supabase
npm run smoke:live-readiness
```

## 6. 會部署的 Edge Functions

- `market-summary`
- `discovery-latest`
- `reports-latest`
- `ai-check`
- `market-data-ingest`
- `score-calculate`
- `stock-war-room`
- `watchlist-summary`
- `alert-evaluate`
- `report-generate`
- `report-detail`
- `profile-settings`
- `data-health`
- `user-data-export`
- `account-delete`
- `portfolio-summary`
- `ai-check-history`

## 7. 接線完成後的驗收標準

需全部通過：

```powershell
npm run doctor:staging-env -- --require-live --free-mode
npm run doctor:live-readiness
npm run smoke:supabase
npm run smoke:live-readiness
npm run package1:preflight
```

App 前端需使用：

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
EXPO_PUBLIC_DEMO_MODE=false
JASIC_AI_MODE=rule_based
```

## 8. 目前外部阻塞點

程式端 staging 接線流程已具備。真正雲端部署仍需要你提供：

```text
Project ref
Project URL
Public anon key
CRON_SECRET
```

若要測登入後 API，另需：

```text
測試使用者 email/password 或短效 JASIC_STAGING_ACCESS_TOKEN
```
