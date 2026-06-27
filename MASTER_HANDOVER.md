# JASIC App MASTER_HANDOVER

交接日期：2026-06-27  
專案位置：`outputs/jasic-app`  
最後確認 Commit：`a6b8615 feat: harden ai check input guardrails`  
技術棧：React Native + Expo + TypeScript、Supabase、OpenAI API、React Query、Zustand  
產品邊界：不做自動下單、不保證獲利、不做課程/購物車/募資/付款銷售網站。

---

## 1. 專案目前完成進度

以「Alpha MVP 可操作版本」估算：**82%**

以「正式商用上線版本」估算：**60–65%**

| 模組 | 完成度 | 說明 |
|---|---:|---|
| App Shell / Web + Mobile UI | 90% | Expo universal app、Web 與手機版響應式版面已完成主體。 |
| Macro Dashboard | 85% | 五大總經指標、Market Score、燈號、AI 摘要、資料新鮮度與分數拆解已完成；正式總經資料源仍需接入。 |
| Three-Layer Stock Funnel | 85% | 三層選股、Top 20、搜尋/排序/篩選/匯出與證據展示已完成；法人/OI/主力資料仍待正式資料商補齊。 |
| AI Check | 90% | 使用者輸入、前後端驗證、OpenAI Edge Function、結論/原因/風險/建議、歷史紀錄與分享已完成。 |
| Personalized Analysis | 80% | Watchlist、Score Change、Risk Alert、AI 個股摘要、持倉風險摘要已完成。 |
| Trend Reports | 80% | 四種報告、報告詳情、書籤、Markdown 匯出、排程產生邏輯已完成。 |
| Supabase Schema / API | 82% | 主要資料表、RLS、Edge Functions、排程 pipeline 範本完成。 |
| Production Data Pipeline | 45% | TWSE/TPEx 最新行情 ingest 已有基礎；歷史回補、授權資料源、總經/OI/籌碼正式源尚未完成。 |
| Governance / Privacy / Guardrails | 80% | Terms gate、隱私文件、資料匯出/刪除、AI Guardrails、分享遮罩已完成。 |
| Release / DevOps | 65% | CI 與 market-data GitHub Actions 範本已存在；GitHub remote、Supabase secrets、EAS 實機 build 尚待完成。 |

---

## 2. 已完成功能

### 2.1 App 基礎架構

- Expo React Native + TypeScript 專案已建立。
- 支援 Web 與 Mobile 響應式介面。
- React Query 負責 API cache / loading / error state。
- Zustand 管理本機 UI 狀態、watchlist demo 狀態與 research navigation。
- Supabase client 與 Edge Function 呼叫層已整合。
- Web build 指令已可通過：`npm run build:web`。

### 2.2 Macro Dashboard

- 五大總經指標卡片。
- Market Score。
- 市場燈號。
- AI 市場摘要。
- 指標資料新鮮度、來源、更新頻率、觀察日與發布日。
- Market Score decomposition，顯示分數構成與 rule version。
- Dashboard 支援資料不足時 fallback demo data。

### 2.3 Three-Layer Stock Funnel

- 第一層：市場環境篩選。
- 第二層：法人 / 主力 / OI 篩選。
- 第三層：技術面 / 風險篩選。
- 輸出 Top 20 候選股。
- 候選股可搜尋、排序、篩選。
- 可匯出候選股資料。
- 顯示每一層通過/未通過與 evidence reason。

### 2.4 Stock War Room

- 個股 War Room 頁面。
- 顯示綜合分數、分項分數、趨勢、價格/風險資訊。
- 顯示支撐壓力、風險、觀察重點。
- 支援加入/移出 watchlist。
- 支援帶入 AI Check 預填股票代號。
- 支援研究分享文字產生，包含：
  - data timestamp
  - rule version
  - confidence
  - risk
  - local deep link
  - 免責聲明
- 分享內容不包含成本、張數、帳戶敏感資訊。

### 2.5 AI Check

- 使用者可輸入：
  - 股票代號
  - 成本
  - 張數
  - 投資期間
  - 風險偏好
- 輸出固定包含：
  - 結論
  - 原因
  - 風險
  - 建議
- 建議類型限制為：
  - 加碼
  - 續抱
  - 觀望
  - 減碼
  - 停損
- 明確禁止：
  - 保證獲利
  - 自動交易
  - 下單指令
- 前端、Edge Function、資料庫三層輸入防護已完成。
- Guardrail 範圍：
  - 股票代號：4 位數台股格式
  - 成本：0.01–1,000,000
  - 張數：0.001–10,000
  - 持倉總成本上限：10,000,000,000 TWD
  - investment horizon / risk profile canonical enum
- AI Check History / Journal 已完成。
- AI Check 分享已完成，會遮罩使用者敏感持倉資訊。

### 2.6 Personalized Analysis

- Watchlist 摘要。
- Score Change。
- Risk Alert。
- AI 個股摘要。
- Alert Preferences。
- Position Manager。
- Portfolio Risk / Valuation Summary。
- 可由持倉資料預填 AI Check。

### 2.7 Trend Reports

- Daily Market Report。
- Weekly Core Pool Report。
- Stock War Room Report。
- Risk Alert Report。
- Report Library。
- Report Detail。
- Report Bookmark。
- Markdown export。
- Supabase Edge Function 可排程產生報告。

### 2.8 Settings / Governance / Privacy

- Profile settings。
- Alpha terms gate。
- Methodology / source disclosure。
- Data Health Operations Center。
- User data export。
- Account delete audit。
- 隱私與部署文件已建立：
  - `docs/PRIVACY.md`
  - `docs/DEPLOYMENT.md`
  - `docs/DATA_PIPELINE.md`
  - `docs/ALPHA_RELEASE.md`

### 2.9 Data Pipeline / DevOps

- Supabase migrations 已建立。
- Supabase Edge Functions 已建立。
- GitHub Actions：
  - `.github/workflows/ci.yml`
  - `.github/workflows/market-data.yml`
- CI 內容包含：
  - `npm ci`
  - `npm run typecheck`
  - `npm run typecheck:edge`
  - `npm test`
  - `npm run build:web`
- Market data workflow 內容包含：
  - market-data-ingest
  - score-calculate
  - alert-evaluate
  - report-generate

---

## 3. 進行中功能

| 功能 | 狀態 | 下一步 |
|---|---|---|
| 正式市場資料接入 | 部分完成 | 補歷史行情、法人、融資券、OI、主力籌碼資料源。 |
| 總經資料自動化 | 部分完成 | 接入官方/授權總經資料 API，取代 demo / seed。 |
| JASIC Score 校準 | 部分完成 | 依 JASIC Score Constitution 做權重回測與 rule version 正式化。 |
| Data Health Center | 已有 UI 與 API | 加入交易日曆、假日判斷、資料源 SLA 與告警。 |
| GitHub 同步 | 本機完成 | 設定 remote、push main、設定 GitHub secrets。 |
| Supabase production deploy | 尚未正式部署 | 建立 production project、執行 migrations、部署 Edge Functions。 |
| EAS 實機 build | 設定已起步 | 執行 iOS/Android preview build、驗證 deep link 與 clipboard/share。 |

---

## 4. 尚未完成功能

- 完整歷史行情回補。
- 五大總經指標正式資料源接入。
- 法人 / 主力 / OI 完整資料商接入。
- 推播通知或 email risk alert。
- 正式使用者登入流程的 production 驗證。
- Native iOS / Android store build 與上架流程。
- Universal Links / App Links production domain 設定。
- 完整 admin 後台。
- 完整資料源 SLA 監控與異常通知。
- OpenAI prompt 版本管理後台。
- 法務審查完成版免責聲明。
- 大量使用者壓力測試。
- 付費、訂閱、課程、購物車、募資、付款功能：依產品邊界不做。
- 自動下單、券商串接、自動交易：依產品邊界不做。

---

## 5. 專案目錄結構

```text
jasic-app/
├─ .github/
│  └─ workflows/
│     ├─ ci.yml
│     └─ market-data.yml
├─ assets/
├─ dist/
├─ docs/
│  ├─ ALPHA_RELEASE.md
│  ├─ DATA_PIPELINE.md
│  ├─ DEPLOYMENT.md
│  └─ PRIVACY.md
├─ scripts/
│  └─ serve-static.cjs
├─ src/
│  ├─ AppShell.tsx
│  ├─ components/
│  │  ├─ AiCheckHistory.tsx
│  │  ├─ AlertPreferences.tsx
│  │  ├─ DataHealthOperations.tsx
│  │  ├─ PortfolioRiskSummary.tsx
│  │  ├─ PositionManager.tsx
│  │  └─ ui.tsx
│  ├─ data/
│  │  └─ mockData.ts
│  ├─ hooks/
│  │  ├─ useAuthSession.ts
│  │  └─ useResearchNavigation.ts
│  ├─ lib/
│  │  ├─ dataHealth.ts
│  │  ├─ discovery.ts
│  │  ├─ governance.ts
│  │  ├─ positions.ts
│  │  ├─ reportExport.ts
│  │  ├─ researchNavigation.ts
│  │  ├─ researchShare.ts
│  │  ├─ shareResearch.ts
│  │  └─ supabase.ts
│  ├─ screens/
│  │  ├─ AiCheckScreen.tsx
│  │  ├─ AuthScreen.tsx
│  │  ├─ DashboardScreen.tsx
│  │  ├─ DiscoveryScreen.tsx
│  │  ├─ OnboardingScreen.tsx
│  │  ├─ ReportsScreen.tsx
│  │  ├─ SettingsScreen.tsx
│  │  ├─ StockWarRoomScreen.tsx
│  │  └─ WatchlistScreen.tsx
│  ├─ services/
│  │  └─ api.ts
│  ├─ store/
│  │  └─ useAppStore.ts
│  ├─ theme.ts
│  └─ types.ts
├─ supabase/
│  ├─ config.toml
│  ├─ seed.sql
│  ├─ migrations/
│  │  ├─ 20260620000000_initial.sql
│  │  ├─ 20260620000100_core_market_tables.sql
│  │  ├─ 20260620000200_market_ingestion.sql
│  │  ├─ 20260620000300_alerts.sql
│  │  ├─ 20260620000400_report_generation.sql
│  │  ├─ 20260620000500_profile_governance.sql
│  │  ├─ 20260620000600_privacy_lifecycle.sql
│  │  ├─ 20260620000700_user_positions.sql
│  │  ├─ 20260621000100_report_bookmarks.sql
│  │  └─ 20260621000200_ai_check_guardrails.sql
│  └─ functions/
│     ├─ _shared/
│     ├─ account-delete/
│     ├─ ai-check/
│     ├─ ai-check-history/
│     ├─ alert-evaluate/
│     ├─ data-health/
│     ├─ discovery-latest/
│     ├─ market-data-ingest/
│     ├─ market-summary/
│     ├─ portfolio-summary/
│     ├─ profile-settings/
│     ├─ report-detail/
│     ├─ report-generate/
│     ├─ reports-latest/
│     ├─ score-calculate/
│     ├─ stock-war-room/
│     ├─ user-data-export/
│     └─ watchlist-summary/
├─ tests/
├─ App.tsx
├─ app.json
├─ eas.json
├─ package.json
├─ README.md
├─ tsconfig.edge.json
└─ tsconfig.json
```

---

## 6. 資料庫 Schema

### 6.1 使用者與權限

| Table | 用途 |
|---|---|
| `profiles` | 使用者 profile、terms/privacy consent、偏好設定、風險設定。 |
| `watchlists` | 使用者 watchlist 群組。 |
| `watchlist_items` | watchlist 內個股。 |
| `user_positions` | 使用者自行輸入的持倉資料，用於風險摘要與 AI Check 預填。 |
| `account_deletion_audit` | 帳號刪除申請與稽核紀錄。 |

### 6.2 股票與市場資料

| Table | 用途 |
|---|---|
| `stocks` | 股票基本資料。 |
| `stock_daily_prices` | 個股日行情。 |
| `institutional_flows_daily` | 法人買賣超/籌碼資料。 |
| `stock_features_daily` | 個股特徵值，用於 score 與 funnel。 |
| `stock_score_snapshots` | 個股分數快照。 |
| `market_score_snapshots` | 市場分數、燈號與總經摘要快照。 |
| `macro_indicator_definitions` | 五大總經指標定義、資料來源與更新頻率。 |
| `macro_indicator_values` | 總經指標值與歷史資料。 |

### 6.3 Discovery / Reports

| Table | 用途 |
|---|---|
| `discovery_runs` | 每次三層漏斗計算 run。 |
| `discovery_candidates` | Discovery Top 20 候選股與各層 evidence。 |
| `reports` | Daily / Weekly / War Room / Risk Alert 報告內容。 |
| `report_bookmarks` | 使用者收藏報告。 |

### 6.4 AI Check / Alerts

| Table | 用途 |
|---|---|
| `ai_check_requests` | AI Check 使用者輸入與 normalized payload。 |
| `ai_check_results` | AI Check 結果、模型、prompt version、風險聲明。 |
| `alert_rules` | 使用者 watchlist / score / risk alert 規則。 |
| `alerts` | 已觸發的 risk alert / score alert。 |

### 6.5 Data Pipeline / Governance

| Table | 用途 |
|---|---|
| `data_sources` | 資料源 registry，包含 provider、frequency、status。 |
| `ingestion_runs` | 每次資料擷取紀錄，包含 received / valid / rejected / error。 |
| `rule_versions` | JASIC Score / funnel / report generation 規則版本。 |

### 6.6 重要 Migration

| Migration | 內容 |
|---|---|
| `20260620000000_initial.sql` | profiles、stocks、stock scores、watchlists、AI Check 基礎表。 |
| `20260620000100_core_market_tables.sql` | market score、macro、discovery、reports。 |
| `20260620000200_market_ingestion.sql` | data sources、ingestion runs、price、institutional flow、features、rule versions。 |
| `20260620000300_alerts.sql` | alert rules、alerts。 |
| `20260620000400_report_generation.sql` | 報告產生與索引強化。 |
| `20260620000500_profile_governance.sql` | profile governance / consent 欄位。 |
| `20260620000600_privacy_lifecycle.sql` | account deletion audit。 |
| `20260620000700_user_positions.sql` | 使用者持倉。 |
| `20260621000100_report_bookmarks.sql` | report bookmarks。 |
| `20260621000200_ai_check_guardrails.sql` | AI Check DB-level input constraints。 |

---

## 7. API 列表

所有 Supabase Edge Functions 位於 `supabase/functions/*/index.ts`。一般 App API 由 `src/services/api.ts` 呼叫；排程 API 由 GitHub Actions 或 cron 呼叫。

### 7.1 App-facing API

| Function | Method | Auth | 用途 |
|---|---|---|---|
| `market-summary` | POST / OPTIONS | 使用者 session 或 anon fallback | 取得 Macro Dashboard、五大指標、Market Score、燈號。 |
| `discovery-latest` | POST / OPTIONS | 使用者 session 或 anon fallback | 取得最新三層漏斗 run 與 Top 20 候選股。 |
| `stock-war-room` | POST / OPTIONS | 使用者 session 或 anon fallback | 取得個股 War Room 分析。 |
| `ai-check` | POST / OPTIONS | 使用者 session | 產生 AI Check 結果並寫入 request/result。 |
| `ai-check-history` | POST / OPTIONS | 使用者 session | 讀取 AI Check 歷史紀錄。 |
| `watchlist-summary` | POST / OPTIONS | 使用者 session | 取得 watchlist、score change、alerts、AI summary。 |
| `portfolio-summary` | POST / OPTIONS | 使用者 session | 根據 user positions 產生風險與估值摘要。 |
| `reports-latest` | POST / OPTIONS | 使用者 session 或 anon fallback | 取得報告列表。 |
| `report-detail` | POST / OPTIONS | 使用者 session 或 anon fallback | 取得單一報告詳情。 |
| `profile-settings` | POST / OPTIONS | 使用者 session | 讀寫使用者設定、terms/privacy consent。 |
| `data-health` | POST / OPTIONS | 使用者 session | 取得 Data Health Operations 狀態。 |
| `user-data-export` | POST / OPTIONS | 使用者 session | 匯出使用者個人資料。 |
| `account-delete` | POST / OPTIONS | 使用者 session | 申請帳號資料刪除並寫入 audit。 |

### 7.2 Scheduled / Admin API

| Function | Method | Auth | 用途 |
|---|---|---|---|
| `market-data-ingest` | POST / OPTIONS | `x-cron-secret` | 擷取 TWSE/TPEx 市場資料並寫入 ingestion tables。 |
| `score-calculate` | POST / OPTIONS | `x-cron-secret` | 產生 provisional market score、stock score、Discovery Top 20。 |
| `alert-evaluate` | POST / OPTIONS | `x-cron-secret` | 評估 watchlist alert rules 並寫入 alerts。 |
| `report-generate` | POST / OPTIONS | `x-cron-secret` | 產生四種 Trend Reports。 |

### 7.3 OpenAI 使用點

| Function | 用途 |
|---|---|
| `ai-check` | 根據股票、成本、張數、期間、風險偏好產生結構化檢核結果。 |
| `market-summary` / report-related shared logic | 可接 AI 摘要；目前需確認 production prompt 與模型設定。 |

---

## 8. 已知 Bug / 風險

| 編號 | 問題 | 影響 | 建議處理 |
|---|---|---|---|
| BUG-001 | GitHub remote 尚未設定。 | 本機可開發，但尚未同步到 GitHub。 | 執行 `git remote add origin <repo-url>` 後 push。 |
| BUG-002 | Production Supabase 尚未部署/驗證。 | Edge Functions 與 DB 目前以本機 repo 完成，正式雲端環境需另外配置。 | 建立 Supabase project、設定 secrets、執行 migrations、部署 functions。 |
| BUG-003 | 部分資料仍是 demo / provisional。 | 分數與分析不可視為正式投資研究輸出。 | 接入正式授權資料源並標註 source/version。 |
| BUG-004 | Macro 指標資料源尚未全部自動化。 | Dashboard 可展示架構，但正式資料 freshness 不完整。 | 對接官方或授權 API。 |
| BUG-005 | 法人 / 主力 / OI 資料完整度不足。 | 第二層 funnel 目前無法達正式產品準確度。 | 補資料商或交易所可用資料 mapping。 |
| BUG-006 | Mobile deep link 僅完成程式與 web 驗證，未做實機 build 驗證。 | iOS/Android 上 `jasic://` 行為仍需測。 | EAS preview build 後測試。 |
| BUG-007 | Clipboard / share fallback 在不同瀏覽器權限下可能不一致。 | 分享功能在企業瀏覽器或手機 Web 可能被阻擋。 | 補 Native share sheet 與更多 fallback。 |
| BUG-008 | Data Health 尚未接交易日曆。 | 假日或休市日可能被誤判為資料延遲。 | 加入台股交易日曆。 |
| BUG-009 | PowerShell terminal 偶爾出現中文 mojibake。 | 不影響 app rendering，但會影響 CLI 可讀性。 | 統一 UTF-8 shell/codepage 與文件編碼檢查。 |

---

## 9. 技術債

- `src/services/api.ts` 同時包含 demo fallback 與 live API mapping，後續應拆成 `apiClient`、`demoAdapter`、`liveAdapter`。
- 部分 screen/component 已偏大，建議按 domain 拆成更小的 hooks/components。
- 目前 navigation 是自訂狀態與 deep link parser；若後續頁面增加，可評估導入 Expo Router 或 React Navigation。
- Edge Functions 多數以 service role 操作資料，production 需補更細的 rate limit、audit log、abuse protection。
- JASIC Score 目前仍是 provisional scoring，需建立正式回測、版本審批與變更紀錄。
- OpenAI prompt / model / response schema 需建立獨立版本管理文件。
- Data pipeline 需補重試、idempotency、provider SLA、資料 lineage。
- UI 測試偏少，目前以 unit test + manual browser smoke 為主，尚未建立 Playwright / Detox e2e。
- Native device 行為尚未完整驗證：deep link、clipboard、share、safe area、低階 Android 效能。
- 報告產生目前偏 template-based，正式版需加入更完整的引用來源與生成稽核。

---

## 10. 下一步開發計畫

### Phase 1：交付 GitHub + Supabase 可部署 Alpha

1. 設定 GitHub repository remote。
2. Push `main` 到 GitHub。
3. 設定 GitHub Actions secrets：
   - `SUPABASE_URL`
   - `CRON_SECRET`
4. 建立 Supabase production/staging project。
5. 執行所有 migrations。
6. 部署 Edge Functions。
7. 設定 OpenAI API key 與 Supabase secrets。
8. 跑一次完整 CI：
   - `npm run typecheck`
   - `npm run typecheck:edge`
   - `npm test`
   - `npm run build:web`

### Phase 2：正式資料源接入

1. 決定台股行情資料來源。
2. 決定法人/主力/OI 資料來源。
3. 決定五大總經指標資料來源。
4. 建立 historical backfill script。
5. 補資料源 license / attribution。
6. 將 demo fallback 清楚限制在 development mode。

### Phase 3：Score / Funnel 正式化

1. 依 `JGF-401 JASIC Score Constitution` 固化 scoring weights。
2. 建立 rule version review 流程。
3. 加入回測資料與 benchmark。
4. 定義 Market Score / Stock Score / Funnel Top 20 的正式 publish 流程。
5. 在 UI 明確顯示資料日期、rule version、confidence。

### Phase 4：Alpha 使用者驗證

1. 完成 EAS preview build。
2. 測試 iOS / Android：
   - login
   - AI Check
   - watchlist
   - deep link
   - share
   - clipboard fallback
3. 測試 Web production build。
4. 建立 Alpha issue template。
5. 收集前 10–30 位測試者回饋。

### Phase 5：Production Hardening

1. 加入 rate limit。
2. 加入 Edge Function request audit。
3. 加入 app-level error boundary。
4. 加入 e2e smoke tests。
5. 加入資料 pipeline alerting。
6. 完成法務/合規審查。
7. 完成正式隱私權政策與服務條款。

---

## 驗證紀錄

最近一次完成驗證：

```text
npm run typecheck       PASS
npm run typecheck:edge  PASS
npm test                PASS, 51 tests
npm run build:web       PASS
```

手動 smoke test 已確認：

- AI Check 合法輸入可產生結果。
- AI Check 非法張數會阻擋且不產生 AI 結果。
- 小數張數 0.125 可正確轉換為 125 股。
- Mobile 390px layout 無水平 overflow。
- War Room / AI Check research share 不外洩成本、張數、帳戶資訊。
- Web deep link query route 可導到 settings、AI Check、War Room。

---

## 本機 / GitHub 狀態

- 本機 repo：已建立。
- Git commit：`a6b8615 feat: harden ai check input guardrails`。
- Git working tree：建立本文件前為 clean。
- GitHub remote：尚未設定。
- `.github/workflows`：已建立 CI 與 market-data pipeline 範本。

---

## 交接結論

JASIC App 目前已具備 Alpha MVP 的主要產品能力：Macro Dashboard、三層漏斗選股、AI Check、Watchlist / Personalized Analysis、Trend Reports、Data Health、Privacy / Governance 與 Supabase API 架構。

下一位開發者應優先處理三件事：

1. 將本機 repo 正式推送到 GitHub 並跑通 CI。
2. 完成 Supabase staging / production 部署。
3. 接入正式資料源並校準 JASIC Score / Funnel rule version。

