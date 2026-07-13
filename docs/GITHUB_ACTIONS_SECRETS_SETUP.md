# GitHub Actions Secrets 設定步驟

最後更新：2026-07-14

每日自動更新與報告排程需要 3 個 GitHub Repository Secrets。

## 1. 先在本機檢查需要的值

```powershell
npm run doctor:github-actions-secrets
```

看到以下結果代表本機 `.env.local` 已有可用值：

```text
PASS SUPABASE_URL
PASS SUPABASE_ANON_KEY
PASS CRON_SECRET
```

此檢查工具只顯示遮蔽後的值，不會把完整 secret 印出。

## 2. 到 GitHub 設定 Secrets

打開 repository：

```text
https://github.com/yipojacky-wq/jasic-app
```

進入：

```text
Settings → Secrets and variables → Actions → Repository secrets
```

新增以下 3 個 secrets：

```text
SUPABASE_URL
SUPABASE_ANON_KEY
CRON_SECRET
```

## 3. 對應本機值

| GitHub Secret | 本機 `.env.local` 對應值 |
| --- | --- |
| `SUPABASE_URL` | `EXPO_PUBLIC_SUPABASE_URL` |
| `SUPABASE_ANON_KEY` | `EXPO_PUBLIC_SUPABASE_ANON_KEY` |
| `CRON_SECRET` | `CRON_SECRET` |

請勿使用：

- Supabase service role key
- Supabase secret key
- GitHub personal access token
- 使用者登入 JWT

## 4. 手動測試排程

Secrets 設好後，到：

```text
Actions → JASIC Market Data Pipeline → Run workflow
```

選擇 `main` 分支後執行。

成功時會看到：

```text
PASS market-data-ingest
PASS score-calculate
PASS alert-evaluate
PASS report-generate
Daily market pipeline completed.
```

## 5. 成功後 App 應該會更新

打開：

```text
https://yipojacky-wq.github.io/jasic-app/
```

檢查：

- `1 總經`：市場分數更新
- `2 選股`：Top 20 候選股更新
- `5 報告`：每日市場、核心池週報、個股戰情、風險警示更新

