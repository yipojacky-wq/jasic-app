# Public Preview Deployment

本文件目標是讓 JASIC prototype 產生可分享給別人的公開網址。

目前建議優先順序：

1. GitHub Pages
2. Vercel
3. Netlify
4. Cloudflare Pages

---

## 1. GitHub Pages 自動部署

Repo 已包含：

```text
.github/workflows/pages.yml
scripts/prepare-github-pages.cjs
```

每次 push 到 `main`，GitHub Actions 會自動：

1. 安裝 dependencies。
2. 執行 TypeScript typecheck。
3. 執行 Edge Functions typecheck。
4. 執行 tests。
5. build Expo Web demo。
6. 將 Expo root asset path 改為相對路徑。
7. 加入 `.nojekyll`，確保 GitHub Pages 會服務 `_expo` 目錄。
8. deploy 到 GitHub Pages。

預期公開網址：

```text
https://yipojacky-wq.github.io/jasic-app/
```

第一次使用時，請到 GitHub repo 確認：

```text
Settings → Pages → Build and deployment → Source
```

Source 應選：

```text
GitHub Actions
```

如果 workflow 沒有自動部署，可到：

```text
Actions → Deploy Web Preview to GitHub Pages → Run workflow
```

手動執行一次。

---

## 2. 本機驗證 GitHub Pages build

```bash
npm run build:web:github-pages
```

此指令會輸出：

```text
dist/
dist/.nojekyll
```

並將 `index.html` 內的 root asset path 轉成相對路徑，避免 GitHub Pages project path `/jasic-app/` 造成 JS bundle 404。

---

## 3. 不等 GitHub Actions 的最快方法：上傳 dist ZIP

如果只是要馬上給別人一個網址看雛形，也可以不用等 GitHub Pages。

```bash
npm run package:web-preview
```

指令會產生：

```text
../jasic-web-preview-dist.zip
```

可上傳到：

```text
https://app.netlify.com/drop
```

或 Cloudflare Pages Direct Upload。

---

## 4. Vercel 部署

Vercel 會讀取：

```text
vercel.json
```

設定：

```text
Build Command: npm run build:web
Output Directory: dist
```

Environment Variables：

```env
EXPO_PUBLIC_DEMO_MODE=true
```

---

## 5. Netlify 部署

Netlify 會讀取：

```text
netlify.toml
```

設定：

```text
Build command: npm run build:web
Publish directory: dist
```

Environment Variables：

```env
EXPO_PUBLIC_DEMO_MODE=true
```

---

## 6. Cloudflare Pages 部署

設定：

```text
Framework preset: None
Build command: npm run build:web
Build output directory: dist
```

Environment Variables：

```env
EXPO_PUBLIC_DEMO_MODE=true
```

---

## 7. Demo Preview 檢查清單

公開網址產生後，請檢查：

- `/` 可開啟。
- Dashboard 可看到 Market Score。
- Discovery 可看到 Top 20。
- Stock War Room 可進入個股頁。
- AI Check 可輸入 `2330 / 980 / 1 張` 並產生 demo 結果。
- AI Check 輸入 `0.0001 張` 會被阻擋。
- Reports 可開啟報告詳情。
- Settings 可看到 Data Health / Governance。
- 手機寬度瀏覽器可正常操作。

---

## 8. Live Mode 不是公開雛形必要條件

給別人看雛形時，先使用：

```env
EXPO_PUBLIC_DEMO_MODE=true
```

等 Supabase / OpenAI / 正式資料源完成後，再切 live mode：

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
EXPO_PUBLIC_DEMO_MODE=false
```
