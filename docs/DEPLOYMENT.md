# JASIC Deployment Guide

## 1. Supabase

建立 Supabase 專案後：

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase functions deploy market-summary
supabase functions deploy discovery-latest
supabase functions deploy reports-latest
supabase functions deploy ai-check
supabase functions deploy market-data-ingest
supabase functions deploy score-calculate
supabase functions deploy stock-war-room
supabase functions deploy watchlist-summary
supabase functions deploy alert-evaluate
supabase functions deploy report-generate
supabase functions deploy report-detail
supabase functions deploy profile-settings
supabase functions deploy data-health
supabase functions deploy user-data-export
supabase functions deploy account-delete
```

設定伺服器 secrets：

```bash
supabase secrets set OPENAI_API_KEY=YOUR_KEY
supabase secrets set OPENAI_MODEL=gpt-5.4-mini
supabase secrets set CRON_SECRET=GENERATE_A_LONG_RANDOM_VALUE
```

OpenAI key 和 Supabase service-role key 禁止放入 Expo 的 `EXPO_PUBLIC_*`。

## 2. Expo local environment

建立 `.env.local`：

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
EXPO_PUBLIC_DEMO_MODE=false
```

## 3. Web

```bash
npm run typecheck
npm run build:web
```

`dist/` 可部署到 Cloudflare Pages、Vercel、Netlify 或其他靜態主機。

## 4. Android / iOS

建議使用 Expo EAS：

```bash
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --platform android
npx eas-cli build --platform ios
```

See `docs/ALPHA_RELEASE.md` before initializing the EAS project. Replace the placeholder EAS project ID and confirm the permanent iOS/Android application identifiers first.

iOS App Store 發佈需要 Apple Developer 帳號。Android Play Store 發佈需要 Google Play Console 帳號。

## 5. Production checklist

- 正式資料授權與 attribution 已確認。
- 五大總經與 JASIC Score 規則已有版本號。
- Edge Functions 全部啟用 JWT 驗證與 rate limit。
- AI Check 有 prompt injection、stale data、low confidence 測試。
- RLS 測試證明使用者無法讀取其他人的資料。
- Auth redirect URLs 已加入正式 Web domain 與手機 deep link。
- OpenAI 使用量、錯誤率與延遲已有監控。
- 法務已核准免責聲明、隱私政策及資料保留政策。
- GitHub Actions 已設定 `SUPABASE_URL` 與 `CRON_SECRET` repository secrets。
- 已閱讀 `docs/DATA_PIPELINE.md` 的暫定分數限制。
- 正式測試者已在設定頁接受 Alpha 免責與資料使用條款。
- 使用 disposable 帳號測試資料匯出與永久刪除。
- `docs/PRIVACY.md` 已由合格法務人員審閱。
