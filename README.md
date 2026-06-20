# JASIC Stock Intelligence

JASIC 是一套以 React Native + Expo 建立的股票研究工具，同一套 TypeScript 程式碼可執行於：

- Web 瀏覽器
- Android（Expo Go / EAS Build）
- iOS（Expo Go / EAS Build）

目前版本完成可操作的前端 MVP，內建展示資料；設定 Supabase 環境變數後可切換正式資料層。

## 已完成模組

- Macro Dashboard：五大總經、Market Score、市場燈號、AI 摘要
- Three-Layer Funnel：三層篩選與候選股排名
- Stock War Room：五構面 Score、籌碼、OI、技術與風險
- AI Check：持股輸入與結構化安全建議
- Watchlist：Score Change、Risk Alert、個股摘要
- Live Stock War Room：價格、法人、技術、支撐壓力與資料可信度
- Alert Engine：Score Change、燈號改變、風險門檻
- Trend Reports：四種報告入口
- Report Detail：指標、證據、風險、資料時間與規則版本
- Report Generator：每日市場、核心池週報、個股戰情、風險警示
- Settings & Governance：風險偏好、投資期間、資料健康、方法論與來源揭露
- Privacy Center：個人資料 JSON 匯出、帳號永久刪除與保留說明
- EAS Build：Development、Preview、Production 建置 profiles
- EOD Data Pipeline：TWSE／TPEx 日行情與三大法人
- Provisional Score Pipeline：20 日特徵、Market Score、Stock Score、Top 20

本產品不包含自動下單、獲利保證、課程、購物車或付款功能。

## 本機啟動

需求：Node.js 22.13 以上。

```bash
npm install
npm run web
```

手機測試：

```bash
npm start
```

安裝 Expo Go 後掃描終端機 QR Code。iOS 正式打包需要 macOS 或 Expo EAS Build。

## 環境變數

複製 `.env.example` 為 `.env.local`：

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
EXPO_PUBLIC_API_BASE_URL=https://your-api.example.com/v1
EXPO_PUBLIC_DEMO_MODE=true
```

`EXPO_PUBLIC_*` 會被打包進客戶端，禁止放入 OpenAI API key 或 Supabase service-role key。OpenAI 必須由 Supabase Edge Function 呼叫。

切換正式模式：

```env
EXPO_PUBLIC_DEMO_MODE=false
```

正式模式會啟用 Email OTP 登入並呼叫 Supabase Edge Functions；正式 API 發生錯誤時不會回退成展示建議。

## 驗證與建置

```bash
npm run typecheck
npm run build:web
```

Web 靜態輸出位於 `dist/`。

## GitHub 同步

安裝 Git 後：

```bash
git init
git add .
git commit -m "feat: initialize JASIC universal MVP"
git branch -M main
git remote add origin https://github.com/YOUR_ACCOUNT/jasic-app.git
git push -u origin main
```

後續更新：

```bash
git add .
git commit -m "描述本次更新"
git push
```

專案包含 GitHub Actions，推送或建立 Pull Request 時會自動執行 TypeScript 檢查與 Web 匯出。

## 正式後端下一步

1. 依 `docs/DEPLOYMENT.md` 連結 Supabase 專案。
2. 以 `supabase db push` 套用 `supabase/migrations/`，並視需要載入 `supabase/seed.sql`。
3. 依 `docs/DEPLOYMENT.md` 部署全部 Edge Functions，包括 Stock War Room、Watchlist 與 Alert Engine。
4. 將 `.env.local` 的 `EXPO_PUBLIC_DEMO_MODE` 設為 `false`，前端 adapter 即切換正式 API。
5. OpenAI 回應使用固定 JSON Schema，並保存資料時間、規則版本與 Prompt 版本。

Edge Function secrets：

```bash
supabase secrets set OPENAI_API_KEY=...
supabase secrets set OPENAI_MODEL=gpt-5.4-mini
```

OpenAI 整合採 Responses API Structured Outputs；模型名稱可透過 secret 調整，不寫死在客戶端。

資料管線、官方來源、排程與暫定評分限制請見：

- `docs/DATA_PIPELINE.md`
- `docs/DEPLOYMENT.md`
