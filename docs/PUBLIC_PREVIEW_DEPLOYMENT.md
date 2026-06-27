# Public Preview Deployment

本文件目標是讓 JASIC prototype 產生一個可分享給別人的公開網址。

最短路徑建議使用：

1. Vercel
2. Netlify
3. Cloudflare Pages

原因：目前 Expo Web export 產生的靜態資源使用根路徑，例如 `/_expo/...`，最適合部署在根網域或 preview deployment。GitHub Pages 如果使用 `https://user.github.io/repo-name/` 子路徑，需要額外 base path 處理；因此不建議作為第一個公開雛形網址。

---

## 0. 不等 GitHub 的最快方法：上傳 dist ZIP

如果只是要「馬上給別人一個網址看雛形」，不一定要先 push GitHub。

最快方式：

1. 先產生 Web build：

```bash
npm run build:web
```

2. 將 `dist/` 壓縮成 ZIP。

3. 使用以下任一服務上傳：

```text
https://app.netlify.com/drop
```

或 Cloudflare Pages Direct Upload。

4. 上傳完成後，服務會直接產生公開網址，例如：

```text
https://jasic-preview.netlify.app
```

注意：這種方式適合 demo / prototype 快速分享；正式長期維護仍建議走 GitHub repo + 自動部署。

---

## 1. 目前已完成的部署準備

Repo 已包含：

```text
vercel.json
netlify.toml
.github/workflows/ci.yml
```

本機已確認：

```text
npm run typecheck       PASS
npm run typecheck:edge  PASS
npm test                PASS, 51 tests
npm run build:web       PASS
```

Web build output：

```text
dist/
```

---

## 2. Vercel 部署

### 2.1 GitHub 準備

先建立 GitHub repository，然後在本機設定 remote：

```bash
git remote add origin https://github.com/YOUR_ACCOUNT/jasic-app.git
git push -u origin main
```

### 2.2 Vercel 匯入

1. 到 Vercel Dashboard。
2. 選擇 Add New Project。
3. 匯入 `jasic-app` GitHub repo。
4. Build settings 通常會自動讀取 `vercel.json`：

```text
Build Command: npm run build:web
Output Directory: dist
```

5. Environment Variables 先設定 demo mode：

```env
EXPO_PUBLIC_DEMO_MODE=true
```

6. Deploy。

完成後會得到類似：

```text
https://jasic-app.vercel.app
```

---

## 3. Netlify 部署

### 3.1 GitHub 準備

```bash
git remote add origin https://github.com/YOUR_ACCOUNT/jasic-app.git
git push -u origin main
```

### 3.2 Netlify 匯入

1. 到 Netlify Dashboard。
2. 選擇 Add new site。
3. Import from Git。
4. 選擇 `jasic-app` repo。
5. Netlify 會讀取 `netlify.toml`：

```text
Build command: npm run build:web
Publish directory: dist
```

6. Environment Variables：

```env
EXPO_PUBLIC_DEMO_MODE=true
```

7. Deploy。

完成後會得到類似：

```text
https://jasic-app.netlify.app
```

---

## 4. Cloudflare Pages 部署

1. 到 Cloudflare Pages。
2. Connect to Git。
3. 選擇 `jasic-app` repo。
4. 設定：

```text
Framework preset: None
Build command: npm run build:web
Build output directory: dist
```

5. Environment Variables：

```env
EXPO_PUBLIC_DEMO_MODE=true
```

6. Deploy。

完成後會得到類似：

```text
https://jasic-app.pages.dev
```

---

## 5. GitHub Pages 注意事項

GitHub Pages 預設 project site URL 會長這樣：

```text
https://YOUR_ACCOUNT.github.io/jasic-app/
```

目前 Expo Web build 的資源路徑是根路徑：

```text
/_expo/static/js/web/...
```

如果直接部署到 `/jasic-app/` 子路徑，可能造成 JS/CSS asset 404。因此第一版不建議用 GitHub Pages 當公開 preview。

可行替代方案：

- 使用 Vercel / Netlify / Cloudflare Pages。
- 或把 GitHub Pages 綁定 custom domain，讓網站部署在根路徑。
- 或後續補 Expo web base path post-processing。

---

## 6. Demo Preview 檢查清單

公開網址產生後，請檢查：

- `/` 可開啟。
- Dashboard 可看到 Market Score。
- Discovery 可看到 Top 20。
- Stock War Room 可進入個股頁。
- AI Check 可輸入 2330 / 980 / 1 張並產生 demo 結果。
- AI Check 輸入 0.0001 張會被阻擋。
- Reports 可開啟報告詳情。
- Settings 可看到 Data Health / Governance。
- 手機寬度瀏覽器可正常操作。

---

## 7. Live Mode 不是公開雛形必要條件

給別人看雛形時，先使用：

```env
EXPO_PUBLIC_DEMO_MODE=true
```

等雛形確認後，再切 live mode：

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
EXPO_PUBLIC_DEMO_MODE=false
```

切 live mode 前需完成：

- Supabase migrations
- Supabase Edge Functions
- OpenAI API key
- market data seed / production data source
