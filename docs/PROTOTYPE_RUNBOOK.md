# JASIC App Prototype Runbook

本文件目標是讓開發者用最短時間打開可操作雛形。此模式使用 demo data，不需要先部署 Supabase、不需要 OpenAI API key、不需要正式市場資料源。

---

## 1. 最短可操作版本定義

Prototype 版本可以先驗證：

- Macro Dashboard
- Three-Layer Stock Funnel
- Stock War Room
- AI Check demo flow
- Watchlist / Personalized Analysis
- Position Manager
- Portfolio Risk Summary
- Trend Reports
- Settings / Data Health / Governance UI
- Web 與手機寬度響應式畫面

Prototype 版本暫不代表正式投資研究輸出，因為仍使用 demo / provisional data。

---

## 2. 啟動條件

需要：

- Node.js 22+
- npm
- 本機專案目錄：`outputs/jasic-app`

不需要：

- Supabase project
- OpenAI API key
- GitHub remote
- 台股正式資料源

---

## 3. 5 分鐘啟動流程

```bash
cd outputs/jasic-app
npm install
npm run prototype:web
```

Expo 會顯示本機網址，通常是：

```text
http://localhost:8081
```

如果 8081 被占用，Expo 會提示使用其他 port。

---

## 4. Demo Mode

不設定 `.env.local` 時，App 會自動使用 demo fallback。

若要明確指定 demo mode，可建立 `.env.local`：

```env
EXPO_PUBLIC_DEMO_MODE=true
```

這個模式下：

- 不會呼叫 Supabase production API。
- 不會呼叫 OpenAI API。
- AI Check 會回傳 demo 結果。
- Watchlist、持倉、報告收藏會使用本機/demo 狀態。

---

## 5. 建議 Demo 操作路線

### 5.1 Dashboard

先看：

- Market Score
- 市場燈號
- 五大總經指標
- AI 市場摘要
- 分數拆解與資料新鮮度

### 5.2 Discovery

操作：

- 搜尋股票
- 排序候選股
- 檢查三層漏斗 evidence
- 匯出 Top 20

### 5.3 Stock War Room

操作：

- 點選候選股
- 查看分數、風險、技術面、籌碼/OI 狀態
- 加入 watchlist
- 分享研究摘要
- 帶入 AI Check

### 5.4 AI Check

測試輸入：

```text
股票代號：2330
成本：980
張數：1
投資期間：中期
風險偏好：平衡
```

也可測試 guardrail：

```text
張數：0.0001
```

預期結果：App 應阻擋不合理輸入，不產生 AI 結果。

### 5.5 Watchlist / Personalized Analysis

操作：

- 查看 watchlist
- 查看 score change
- 查看 risk alert
- 新增/刪除持倉
- 從持倉預填 AI Check

### 5.6 Reports

操作：

- 查看 Daily Market Report
- 查看 Weekly Core Pool Report
- 查看 Stock War Room Report
- 查看 Risk Alert Report
- 收藏報告
- 匯出 Markdown

---

## 6. Web Build 驗證

```bash
npm run build:web
npm run preview:web
```

預設會輸出到：

```text
dist/
```

此步驟用於確認雛形可被部署到靜態網站服務，例如 Vercel、Netlify、Cloudflare Pages。

---

## 7. Mobile 雛形驗證

最快方式：

```bash
npm start
```

然後用 Expo Go 掃描 QR Code。

注意：

- Expo Go 可先看 UI 與流程。
- Deep link、clipboard、share、推播等行為仍需 EAS preview build 才能正式驗證。

---

## 8. 切到 Live Mode 的最小條件

當要從雛形切到 Supabase live mode，需要：

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
EXPO_PUBLIC_DEMO_MODE=false
```

Supabase 端還需要：

- migrations 已執行
- Edge Functions 已部署
- `OPENAI_API_KEY` 已設定
- `CRON_SECRET` 已設定
- seed 或正式市場資料已匯入

---

## 9. 雛形完成標準

Prototype 可交付的最低標準：

- `npm run prototype:web` 可啟動。
- Dashboard / Discovery / War Room / AI Check / Watchlist / Reports / Settings 可點擊。
- AI Check guardrail 可阻擋不合理輸入。
- 390px mobile width 無水平 overflow。
- `npm run typecheck` 通過。
- `npm run typecheck:edge` 通過。
- `npm test` 通過。
- `npm run build:web` 通過。

---

## 10. 下一步

雛形展示完成後，建議下一階段只做三件事：

1. Push 到 GitHub。
2. 部署 Web preview。
3. 建立 Supabase staging 並切 live mode。

