# JASIC 每日自動更新與報告排程 Runbook

最後更新：2026-07-14

本文件說明如何讓 JASIC staging 每日自動完成：

1. 更新 TWSE / TPEx 正式行情
2. 重新計算 Market Score、個股分數與 Top 20
3. 評估追蹤清單警示
4. 產生趨勢報告

## 1. 排程方式

目前使用 GitHub Actions 免費排程：

```text
.github/workflows/market-data.yml
```

預設排程：

```text
週一至週五 17:30 Asia/Taipei
```

GitHub Actions 使用 UTC，因此 workflow cron 為：

```yaml
30 9 * * 1-5
```

## 2. 執行流程

每日管線會依序呼叫 Supabase Edge Functions：

```text
market-data-ingest
↓
score-calculate
↓
alert-evaluate
↓
report-generate
```

本機也可用同一支腳本手動執行：

```powershell
npm run pipeline:daily
```

## 3. GitHub Secrets

請到 GitHub repository：

```text
Settings → Secrets and variables → Actions → Repository secrets
```

確認至少有以下三個 secrets：

```text
SUPABASE_URL
SUPABASE_ANON_KEY
CRON_SECRET
```

範例：

```text
SUPABASE_URL=https://hxftprkavdearldqdwps.supabase.co
SUPABASE_ANON_KEY=sb_publishable_xxx
CRON_SECRET=你的長隨機密碼
```

注意：

- `SUPABASE_ANON_KEY` 可使用 publishable key。
- `CRON_SECRET` 必須與 Supabase Edge Function secret 一致。
- 不要把 `CRON_SECRET` 寫進程式碼或 README。

## 4. 手動觸發

GitHub 網頁操作：

1. 進入 GitHub repository。
2. 點選 `Actions`。
3. 選擇 `JASIC Market Data Pipeline`。
4. 點選 `Run workflow`。
5. 選擇 `main` 分支。
6. 點選綠色 `Run workflow`。

## 5. 成功判斷

成功時 GitHub Actions log 會看到：

```text
PASS market-data-ingest
PASS score-calculate
PASS alert-evaluate
PASS report-generate
Daily market pipeline completed.
```

其中 `report-generate` 應顯示：

```text
generated: 4
```

代表已產生：

- 每日市場
- 核心池週報
- 個股戰情
- 風險警示

## 6. App 端確認

打開公開 PWA：

```text
https://yipojacky-wq.github.io/jasic-app/
```

檢查：

1. `1 總經`
   - 市場分數有資料
   - 五大總經指標有資料
2. `2 選股`
   - 今日 Top 20 候選股有 20 檔
3. `5 報告`
   - 可看到 4 份報告

## 7. 常見問題

### GitHub Action 顯示 CRON_SECRET missing

代表 GitHub Secrets 未設定或名稱錯誤。

請確認 secret 名稱必須是：

```text
CRON_SECRET
```

### market-data-ingest 失敗

可能原因：

- TWSE / TPEx 官方端點暫時無資料
- 當天是假日或休市
- 官方資料尚未發布

若是假日或盤後資料尚未發布，可稍後手動重跑。

### score-calculate 顯示資料不足

代表正式行情歷史資料不足 20 個交易日。

處理方式：

```powershell
npm run market:backfill
```

### report-generate 沒有產生報告

通常是前一步分數或 Discovery run 不完整。

請先確認：

```powershell
npm run pipeline:daily
```

若仍失敗，再檢查 Supabase Edge Function log。

## 8. 維護建議

短期 staging：

- 使用 GitHub Actions 排程即可。
- 每天盤後自動跑一次。
- Demo 前可手動 Run workflow 一次。

正式產品前：

- 增加資料異常通知。
- 增加行情端點重試。
- 增加報告版本比較。
- 增加排程成功/失敗通知到 email 或 Slack。

