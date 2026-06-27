# GitHub Long-Term Deployment

本文件目標是把目前本機 JASIC prototype 變成可長期更新的 GitHub 專案，並串接 Vercel / Netlify / Cloudflare Pages 產生固定公開網址。

---

## 1. 目前狀態

已完成：

- 本機 Git repo
- Web prototype
- Web build
- Web preview ZIP
- Vercel 設定：`vercel.json`
- Netlify 設定：`netlify.toml`
- CI workflow：`.github/workflows/ci.yml`
- Market data workflow 範本：`.github/workflows/market-data.yml`

尚未完成：

- GitHub remote
- Push 到 GitHub
- Vercel / Netlify / Cloudflare Pages 匯入 repo
- Production Supabase secrets

---

## 2. 建立 GitHub Repository

在 GitHub 建立新的 repository，例如：

```text
jasic-app
```

建議：

- Visibility：Private 或 Public 都可以。
- 不要勾選 Initialize with README，因為本機 repo 已有 README。

建立後會得到 repo URL，例如：

```text
https://github.com/YOUR_ACCOUNT/jasic-app.git
```

---

## 3. 一鍵連接 GitHub remote 並 push

在專案根目錄執行：

```bash
npm run github:connect -- -RepoUrl "https://github.com/YOUR_ACCOUNT/jasic-app.git"
```

這個指令會：

1. 檢查 working tree 是否乾淨。
2. 新增 `origin` remote。
3. 確認 branch 為 `main`。
4. Push 到 GitHub。

如果已經有 origin，但要改成新的 repo：

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/connect-github-remote.ps1 -RepoUrl "https://github.com/YOUR_ACCOUNT/jasic-app.git" -Force
```

---

## 4. Push 成功後檢查

```bash
git remote -v
git status
git log --oneline -5
```

預期：

```text
origin  https://github.com/YOUR_ACCOUNT/jasic-app.git (fetch)
origin  https://github.com/YOUR_ACCOUNT/jasic-app.git (push)
working tree clean
```

---

## 5. 串接 Vercel

1. 開啟 Vercel Dashboard。
2. Add New Project。
3. Import Git Repository。
4. 選擇 `jasic-app`。
5. Vercel 會讀取 `vercel.json`。
6. Environment Variables 先設定：

```env
EXPO_PUBLIC_DEMO_MODE=true
```

7. Deploy。

完成後會得到固定網址：

```text
https://jasic-app.vercel.app
```

後續每次 push 到 GitHub，Vercel 會自動部署新版本。

---

## 6. 串接 Netlify

1. 開啟 Netlify Dashboard。
2. Add new site。
3. Import from Git。
4. 選擇 `jasic-app`。
5. Netlify 會讀取 `netlify.toml`。
6. Environment Variables：

```env
EXPO_PUBLIC_DEMO_MODE=true
```

7. Deploy。

後續每次 push 到 GitHub，Netlify 會自動部署新版本。

---

## 7. 日常更新流程

修改程式後：

```bash
npm run typecheck
npm run typecheck:edge
npm test
npm run build:web
git status
git add .
git commit -m "描述本次變更"
git push
```

Vercel / Netlify 會自動重新部署。

---

## 8. GitHub Actions

GitHub push 後，CI 會執行：

```bash
npm ci
npm run typecheck
npm run typecheck:edge
npm test
npm run build:web
```

如果 CI 失敗，先不要把該版本視為可展示版本。

---

## 9. 長期公開網址與 Demo Mode

第一階段建議維持：

```env
EXPO_PUBLIC_DEMO_MODE=true
```

這代表：

- 可展示產品流程。
- 不需要 Supabase production。
- 不需要 OpenAI API key。
- 不需要正式資料源。
- 分析內容只是 demo，不是正式投資研究輸出。

等 Supabase / OpenAI / 正式資料源完成後再切：

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
EXPO_PUBLIC_DEMO_MODE=false
```

---

## 10. 不建議第一階段使用 GitHub Pages

目前 Expo Web export 的 asset path 使用根路徑：

```text
/_expo/static/js/web/...
```

GitHub Pages project site 通常部署在：

```text
https://YOUR_ACCOUNT.github.io/jasic-app/
```

這會產生子路徑 asset 問題。除非：

- 綁定 custom domain，讓網站在根路徑。
- 或後續加入 base path post-processing。

因此第一階段建議使用：

- Vercel
- Netlify
- Cloudflare Pages

