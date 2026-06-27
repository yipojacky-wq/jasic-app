# JASIC Stock Intelligence

JASIC 是一套股票分析工具型 App，不是課程銷售網站，也不包含購物車、付款、募資或自動下單功能。

本專案使用 React Native + Expo + TypeScript 建立，可同時支援：

- Web
- iOS / Android mobile app
- Supabase backend
- OpenAI API assisted analysis

目前版本定位為 Alpha MVP / Prototype，可先用 demo mode 操作完整雛形。

---

## 快速啟動 Prototype

此模式不需要 Supabase、不需要 OpenAI API key、不需要正式市場資料源。

```bash
npm install
npm run prototype:web
```

Expo 通常會開在：

```text
http://localhost:8081
```

更多操作說明請看：

```text
docs/PROTOTYPE_RUNBOOK.md
```

---

## 主要功能

- Macro Dashboard
  - 五大總經指標
  - Market Score
  - 市場燈號
  - AI 市場摘要
  - 資料新鮮度與分數拆解

- Three-Layer Stock Funnel
  - 市場環境篩選
  - 法人 / 主力 / OI 篩選
  - 技術面 / 風險篩選
  - Top 20 候選股

- Stock War Room
  - 個股分數
  - 分項 evidence
  - 風險與支撐壓力
  - Watchlist
  - Research sharing

- AI Check
  - 股票代號、成本、張數、投資期間、風險偏好
  - 輸出結論、原因、風險、建議
  - 不保證獲利
  - 不自動交易
  - 前端、Edge Function、資料庫三層 guardrails

- Personalized Analysis
  - Watchlist
  - Score Change
  - Risk Alert
  - AI 個股摘要
  - Position Manager
  - Portfolio Risk Summary

- Trend Reports
  - Daily Market Report
  - Weekly Core Pool Report
  - Stock War Room Report
  - Risk Alert Report
  - Report Library
  - Markdown export

- Settings / Governance
  - Terms gate
  - Data Health Operations
  - Methodology / source disclosure
  - User data export
  - Account deletion flow

---

## 常用指令

```bash
npm run prototype:web
npm run web
npm start
npm run typecheck
npm run typecheck:edge
npm test
npm run build:web
npm run build:web:github-pages
npm run package:web-preview
npm run doctor:deploy
npm run preview:web
```

---

## 公開預覽網址

最短公開預覽路徑建議使用 Vercel、Netlify 或 Cloudflare Pages。

本 repo 已包含：

```text
vercel.json
netlify.toml
.github/workflows/pages.yml
```

部署說明：

```text
docs/PUBLIC_PREVIEW_DEPLOYMENT.md
docs/GITHUB_LONG_TERM_DEPLOYMENT.md
docs/NEXT_5_PHASES_PLAN.md
```

---

## Demo Mode

不設定 `.env.local` 時，App 會自動 fallback 到 demo mode。

如需明確指定：

```env
EXPO_PUBLIC_DEMO_MODE=true
```

Live mode 範例：

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
EXPO_PUBLIC_DEMO_MODE=false
```

請勿將 OpenAI API key 或 Supabase service-role key 放入 `EXPO_PUBLIC_*`。

---

## Supabase

Supabase 相關檔案：

```text
supabase/migrations/
supabase/functions/
supabase/seed.sql
```

部署 live mode 前需要：

1. 建立 Supabase project。
2. 執行 migrations。
3. 部署 Edge Functions。
4. 設定 secrets：
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL`
   - `CRON_SECRET`
5. 匯入 seed 或正式市場資料。

詳細部署說明：

```text
docs/DEPLOYMENT.md
docs/DATA_PIPELINE.md
```

---

## GitHub Actions

已建立：

```text
.github/workflows/ci.yml
.github/workflows/market-data.yml
```

CI 會執行：

```bash
npm ci
npm run typecheck
npm run typecheck:edge
npm test
npm run build:web
```

Market data workflow 會依序呼叫：

- `market-data-ingest`
- `score-calculate`
- `alert-evaluate`
- `report-generate`

---

## 專案交接文件

完整交接文件：

```text
MASTER_HANDOVER.md
```

Prototype 操作文件：

```text
docs/PROTOTYPE_RUNBOOK.md
```

---

## 產品限制

本專案不提供：

- 自動下單
- 保證獲利
- 券商交易串接
- 購物車
- 課程頁
- 募資頁
- 付款功能

所有 AI 與分數輸出皆應視為研究輔助，不是投資保證或交易指令。
