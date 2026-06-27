# JASIC Next 5 Development Phases

日期：2026-06-27  
狀態：Prototype 已可 build、已 push GitHub、GitHub Pages workflow 已建立。

本文件把後續尚未完成的五個階段拆成可執行任務。原則是先讓使用者看得到、再讓資料可信、再讓模型與分數可審計，最後才做正式營運強化。

---

## Phase 1：公開雛形與部署穩定化

目標：讓任何人可以用網址打開 JASIC prototype。

目前已完成：

- GitHub repo：`https://github.com/yipojacky-wq/jasic-app`
- GitHub Pages workflow：`.github/workflows/pages.yml`
- GitHub Pages build script：`scripts/prepare-github-pages.cjs`
- Vercel config：`vercel.json`
- Netlify config：`netlify.toml`
- Web preview ZIP：`jasic-web-preview-dist.zip`
- Deployment doctor：`npm run doctor:deploy`

待完成：

- 在 GitHub Settings → Pages 中選擇 `gh-pages / root`。
- 開啟 `https://yipojacky-wq.github.io/jasic-app/` 驗證。
- 若 GitHub Pages 仍有延遲，使用 Netlify Drop 上傳 ZIP 取得臨時網址。

完成標準：

- 公開網址可開啟。
- Dashboard / Discovery / AI Check / Reports 可操作。
- 手機瀏覽器可正常顯示。

---

## Phase 2：Supabase Staging 後端

目標：讓 prototype 從純 demo mode 逐步切到 staging live mode。

目前已完成：

- Supabase migrations 已存在。
- 17 個 Edge Functions 已存在。
- `supabase/config.toml` 已定義 JWT 行為。
- Supabase staging runbook：`docs/SUPABASE_STAGING_RUNBOOK.md`
- Supabase staging doctor：`npm run doctor:supabase`
- Supabase staging endpoint smoke test：`npm run smoke:supabase`

待完成：

1. 建立 Supabase staging project。
2. 執行 migrations。
3. 部署 Edge Functions。
4. 設定 secrets：
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL`
   - `CRON_SECRET`
5. 匯入 `supabase/seed.sql`。
6. 將 staging 網址與 anon key 設定到部署平台。

完成標準：

- `EXPO_PUBLIC_DEMO_MODE=false` 可正常啟動。
- `market-summary`、`discovery-latest`、`stock-war-room`、`ai-check` 可回應。
- Auth / RLS / profile settings 可正常工作。

---

## Phase 3：正式資料源與資料健康

目標：讓 JASIC 的市場分析輸出不再依賴 demo/provisional data。

目前已完成：

- 資料源 adapter contract：`supabase/functions/_shared/marketDataContracts.ts`
- Adapter contract 測試：`tests/market-data-contracts.test.ts`
- 資料源接入規格：`docs/DATA_SOURCE_ADAPTER_CONTRACT.md`
- 已列入官方來源：TWSE daily quotes、TWSE T86、TPEx daily quotes、TPEx 3 institutional flow。
- 已封鎖待審來源：融資券、OI、五大總經指標正式來源。

待完成：

1. 台股日行情資料源。
2. 個股基本資料。
3. 法人買賣超。
4. 融資融券。
5. 期權 / OI。
6. 主力籌碼資料。
7. 五大總經指標。
8. 歷史資料回補。
9. 台股交易日曆。
10. Data Health SLA 與異常告警。

完成標準：

- Data Health Center 顯示資料日期、來源、品質率。
- Market Score 與 Discovery Top 20 使用 staging 真實資料產生。
- 假日/休市日不誤判資料延遲。

---

## Phase 4：JASIC Score / Funnel / AI Check 正式化

目標：讓分數、選股漏斗與 AI 建議有正式 rule version 與可審計依據。

待完成：

1. 固化 JASIC Score 權重。
2. 建立 Market Score 正式算法。
3. 建立 Stock Score 正式算法。
4. 建立三層漏斗正式條件。
5. 建立 rule version review 流程。
6. 回測歷史資料。
7. 固化 OpenAI prompt version。
8. 建立 AI response schema 稽核。
9. 補完整免責聲明與法務檢查。

完成標準：

- 每個分數與 AI Check 結果都能追溯：
  - data timestamp
  - source
  - rule version
  - prompt version
  - model identifier
- AI Check 不輸出保證獲利、不輸出自動交易指令。

---

## Phase 5：Mobile Preview 與 Production Hardening

目標：讓 JASIC 從 Web prototype 進入可測試手機 App 與可營運狀態。

待完成：

1. EAS preview build。
2. iOS / Android 實機測試。
3. Deep link 測試。
4. Clipboard / share sheet 測試。
5. Error boundary。
6. Rate limit。
7. Edge Function audit log。
8. e2e smoke tests。
9. CI/CD secrets 管理。
10. 正式隱私權政策與服務條款。

完成標準：

- Web public preview 穩定。
- Mobile preview 可安裝。
- 核心流程可在手機實機操作：
  - Dashboard
  - Discovery
  - Stock War Room
  - AI Check
  - Watchlist
  - Reports
  - Settings

---

## 每階段共用驗證

```bash
npm run doctor:deploy
npm run typecheck
npm run typecheck:edge
npm test
npm run build:web:github-pages
```
