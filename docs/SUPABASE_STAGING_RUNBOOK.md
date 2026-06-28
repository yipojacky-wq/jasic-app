# Supabase Staging Runbook

日期：2026-06-27  
階段：Phase 2 — Supabase Staging 後端

本文件目標是把 JASIC 從 demo mode 推進到 staging live mode。此階段仍不是正式商用資料版，但會讓 App 真正呼叫 Supabase Edge Functions、資料表、RLS 與 OpenAI。

---

## 1. Staging 目標

完成後應達成：

- Supabase project 已建立。
- 所有 migrations 已套用。
- 所有 Edge Functions 已部署。
- OpenAI 與 cron secrets 已設定。
- Seed/demo staging data 可用。
- App 可用 `EXPO_PUBLIC_DEMO_MODE=false` 連 staging。

---

## 2. 本機自檢

```bash
npm run doctor:supabase
npm run doctor:live-readiness
npm run typecheck:edge
npm test
```

預期：

```text
All Supabase staging readiness checks passed.
```

---

## 3. 建立 Supabase Project

在 Supabase 建立新 project，建議命名：

```text
jasic-staging
```

取得：

- Project ref
- Project URL
- anon public key

不要把 service-role key 放進前端 `.env.local`。

---

## 4. Supabase CLI 登入與連結

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

---

## 5. 套用資料庫 migrations

```bash
npx supabase db push
```

目前 migrations 包含 profiles、stocks、watchlists、AI Check、market score、macro、discovery、reports、market ingestion、alerts、privacy lifecycle、user positions、report bookmarks 與 AI Check DB guardrails。

---

## 6. 匯入 seed data

如果 staging 要先有 demo market data，可在 Supabase SQL editor 執行：

```text
supabase/seed.sql
```

或使用：

```bash
npx supabase db reset --linked
```

注意：`db reset --linked` 會重設遠端資料庫，只適合 staging，不可對 production 任意使用。

---

## 7. 設定 Edge Function Secrets

建議使用 helper script，避免 secrets 出現在 shell history：

```powershell
$env:OPENAI_API_KEY="YOUR_OPENAI_KEY"
$env:OPENAI_MODEL="gpt-5.4-mini"
$env:CRON_SECRET="GENERATE_A_LONG_RANDOM_VALUE"
npm run supabase:set:secrets
```

Dry run：

```powershell
npm run supabase:set:secrets -- -DryRun
```

手動等價指令：

```bash
npx supabase secrets set OPENAI_API_KEY=YOUR_OPENAI_KEY
npx supabase secrets set OPENAI_MODEL=gpt-5.4-mini
npx supabase secrets set CRON_SECRET=GENERATE_A_LONG_RANDOM_VALUE
```

安全規則：

- OpenAI key 不放進 `EXPO_PUBLIC_*`。
- Supabase service-role key 不放進前端。
- `CRON_SECRET` 只給 GitHub Actions / cron caller 使用。

---

## 8. 部署 Edge Functions

建議使用批次部署腳本：

```powershell
npm run supabase:deploy:functions
```

Dry run：

```powershell
npm run supabase:deploy:functions -- -DryRun
```

腳本會部署 17 個 Edge Functions：

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

---

## 9. 設定前端 Live Mode

建立 `.env.local`：

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
EXPO_PUBLIC_DEMO_MODE=false
```

測試：

```bash
npm run web
```

---

## 10. Endpoint smoke test

部署完成後先跑 endpoint smoke test：

```bash
npm run smoke:supabase
```

這個測試會讀取 `.env.local` 或 shell environment：

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
```

它會逐一檢查所有 Edge Function endpoint 是否存在並可回應 CORS `OPTIONS` request。

限制：

- 不使用 service-role key。
- 不寫資料。
- 不測試登入後的 authenticated POST response。
- 若 function 未部署或 URL 錯誤，會快速失敗。

---

## 10.1 Live readiness POST smoke test

After migrations, seed, secrets, and Edge Functions are deployed, run:

```bash
npm run smoke:live-readiness
```

This validates real POST responses for:

- `market-summary`
- `discovery-latest`
- `data-health`

For the authenticated `data-health` check, provide a short-lived user access token:

```powershell
$env:JASIC_STAGING_ACCESS_TOKEN="YOUR_USER_ACCESS_TOKEN"
npm run smoke:live-readiness
```

Do not use the Supabase service-role key as `JASIC_STAGING_ACCESS_TOKEN`.

## 11. API 驗證

登入後測：

- `market-summary`
- `discovery-latest`
- `stock-war-room`
- `ai-check`
- `ai-check-history`
- `watchlist-summary`
- `reports-latest`
- `report-detail`
- `profile-settings`
- `data-health`

排程/管理 API 測：

- `market-data-ingest`
- `score-calculate`
- `alert-evaluate`
- `report-generate`

管理 API 需要：

```http
x-cron-secret: <CRON_SECRET>
```

---

## 12. GitHub Actions Secrets

到 GitHub repo：

```text
Settings → Secrets and variables → Actions
```

新增：

```text
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
CRON_SECRET=YOUR_CRON_SECRET
```

這會讓 `.github/workflows/market-data.yml` 可以呼叫 staging pipeline。

---

## 13. 完成標準

Phase 2 完成標準：

- `npm run doctor:supabase` 通過。
- Supabase migrations 已套用。
- Edge Functions 已部署。
- `npm run smoke:supabase` 通過。
- App 可用 live mode 開啟。
- AI Check 可呼叫 OpenAI 並寫入 `ai_check_requests` / `ai_check_results`。
- Data Health 可顯示 ingestion/source 狀態。
- GitHub Actions market-data workflow 可手動執行。
