# JASIC Stock Intelligence

JASIC 是一套股票研究與風險檢核工具型 App，定位為「看懂市場、篩選股票、檢查部位、產生趨勢報告」的 MVP。

目前工程階段已完成，可用以下方式操作：

- 手機 / 電腦瀏覽器開啟 PWA
- iPhone / Android 加入主畫面
- Demo mode 直接預覽
- Supabase Free + rule-based AI 進行幾乎全免費 staging

公開 PWA：

```text
https://yipojacky-wq.github.io/jasic-app/
```

## 目前完成狀態

已完成：

- Macro Dashboard
- Three-Layer Stock Funnel
- Stock War Room
- AI Check
- Watchlist / Personalized Analysis
- Trend Reports
- Settings / Data Health
- PWA installable web app
- Supabase schema / Edge Functions
- Rule-based AI Check fallback
- AI governance guardrails
- Rate limits for high-risk user functions
- Public preview smoke test
- Nearly-free staging helper scripts

安全限制：

- 不做自動下單
- 不保證獲利
- 不做課程銷售頁
- 不做購物車 / 付款 / 募資功能
- OpenAI API key 不會放在前端
- Supabase service-role key 不會放在前端

## 快速預覽

```bash
npm install
npm run prototype:web
```

預設網址：

```text
http://localhost:8081
```

不設定 `.env.local` 時，App 會使用 demo mode。

## PWA 手機安裝

iPhone：

1. 用 Safari 開啟 `https://yipojacky-wq.github.io/jasic-app/`
2. 點分享
3. 選「加入主畫面」

Android：

1. 用 Chrome 開啟 `https://yipojacky-wq.github.io/jasic-app/`
2. 點選單
3. 選「安裝應用程式」或「加入主畫面」

PWA 檢查：

```bash
npm run smoke:public-preview
npm run doctor:pwa
```

## 幾乎全免費 staging

免費 staging 使用：

- GitHub Pages：PWA hosting
- Supabase Free：資料庫、Auth、Edge Functions
- TWSE / TPEx / 政府開放資料：資料來源策略
- `JASIC_AI_MODE=rule_based`：不需要 OpenAI API key

需要你準備：

```text
YOUR_PROJECT_REF
https://YOUR_PROJECT.supabase.co
YOUR_PUBLIC_ANON_KEY
YOUR_TEST_USER_EMAIL
YOUR_TEST_USER_PASSWORD
YOUR_LONG_RANDOM_CRON_SECRET
```

產生 `CRON_SECRET`：

```powershell
npm run free-staging:secret -- --env
```

取得測試使用者 token：

```powershell
npm run free-staging:token -- `
  --url "https://YOUR_PROJECT.supabase.co" `
  --anon-key "YOUR_PUBLIC_ANON_KEY" `
  --email "tester@example.com" `
  --password "YOUR_TEST_PASSWORD" `
  --env
```

建立本機 `.env.local`：

```powershell
npm run free-staging:env -- `
  -SupabaseUrl "https://YOUR_PROJECT.supabase.co" `
  -SupabaseAnonKey "YOUR_PUBLIC_ANON_KEY" `
  -StagingAccessToken "YOUR_SHORT_LIVED_USER_TOKEN"
```

部署免費 staging：

```powershell
$env:CRON_SECRET="YOUR_LONG_RANDOM_CRON_SECRET"
npm run free-staging:deploy -- -ProjectRef "YOUR_PROJECT_REF"
```

完整說明：

```text
docs/FREE_STAGING_RUNBOOK.md
docs/FINAL_STAGE_COMPLETION_REPORT.md
```

## 常用指令

```bash
npm run package1:preflight
npm run doctor:final-readiness
npm run doctor:staging-env -- --free-mode
npm run doctor:staging-env -- --require-live --free-mode
npm run smoke:public-preview
npm run smoke:supabase
npm run smoke:live-readiness
npm run typecheck
npm run typecheck:edge
npm test
npm run build:web:github-pages
```

## 專案結構

```text
src/                  App UI, screens, hooks, services
supabase/functions/   Supabase Edge Functions
supabase/migrations/  Database migrations
supabase/seed.sql     Staging seed data
scripts/              Doctors, smoke tests, deployment helpers
docs/                 Runbooks and handoff documents
.github/workflows/    CI, GitHub Pages, staging smoke workflows
```

## 最重要文件

```text
docs/FINAL_STAGE_COMPLETION_REPORT.md
docs/FREE_STAGING_RUNBOOK.md
docs/PWA_RUNBOOK.md
docs/STAGING_VALUES_WORKSHEET.md
docs/STAGING_LAUNCH_CHECKLIST.md
MASTER_HANDOVER.md
```

## OpenAI 升級路線

目前免費 staging 不需要 OpenAI。

若之後要改成 OpenAI 輸出：

```powershell
$env:JASIC_AI_MODE="openai"
$env:OPENAI_API_KEY="YOUR_OPENAI_KEY"
$env:OPENAI_MODEL="gpt-5.4-mini"
$env:CRON_SECRET="YOUR_LONG_RANDOM_CRON_SECRET"
npm run supabase:set:secrets
```

## Final status

工程開發已完成。  
剩餘工作是外部帳號與部署操作：

- 建立 Supabase Free project
- 建立 Supabase Auth 測試使用者
- 填入 Supabase URL / anon key
- 執行免費 staging deployment helper
- 視需要設定 GitHub Actions secrets

