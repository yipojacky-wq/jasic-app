# JASIC Real Market Data Demo

最後更新：2026-07-12

本文件說明 JASIC staging 如何示範「正式股票資訊已連接」。

## 已接資料來源

目前 staging 已接入：

```text
TWSE_STOCK_DAY_ALL     台灣證交所上市日收盤行情
TPEX_DAILY_QUOTES      櫃買中心上櫃日收盤行情
TWSE_T86               台灣證交所三大法人買賣超
TPEX_3INSTI            櫃買中心三大法人買賣超
```

資料用途：

- 更新股票主檔
- 寫入每日收盤價
- 寫入三大法人買賣超
- 更新 Data Health
- 為後續 score calculation 累積歷史資料

## 一鍵示範指令

確認 `.env.local` 已有：

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
CRON_SECRET=
JASIC_STAGING_ACCESS_TOKEN=
```

執行：

```powershell
npm run market:demo
```

此指令會：

1. 呼叫 `market-data-ingest`
2. 嘗試呼叫 `score-calculate`
3. 驗證 `market-summary`
4. 驗證 `discovery-latest`
5. 驗證 `data-health`
6. 驗證 `ai-check`

## 目前示範狀態

最近一次實測：

```text
market-data-ingest PASS
TWSE date: 2026-07-09
TPEx date: 2026-07-09
stocks: 1979
prices: 1963
institutional flows: 1883
```

`score-calculate` 目前可能顯示：

```text
INSUFFICIENT_DATA - At least 20 trading sessions are required before scoring
```

這是預期行為。JASIC Score 目前要求至少 20 個交易日資料，避免用單日資料硬湊技術分數。正式資料已接上，分數會在歷史資料累積後自動可用。

## 操作示範建議

目前可展示：

1. 使用公開 PWA 登入。
2. 進入 Dashboard，看 Market Score 與五大總經指標。
3. 進入 Discovery Pool，看 Top candidates。
4. 進入 Settings / Data Health，看 TWSE / TPEx 官方資料來源狀態。
5. 進入 AI Check，輸入：

```text
股票：2330
成本：980
張數：1
期間：中期
風險：Balanced
```

AI Check 會輸出：

- 結論
- 原因
- 風險
- 建議

仍遵守：

- 不保證獲利
- 不自動下單
- 不作為個人化投資顧問

## 下一步

若要讓 JASIC Score 完全使用正式資料，有兩條路：

1. 持續每天跑 `market-data-ingest`，累積 20 個交易日。
2. 新增歷史行情回補 pipeline，一次補足最近 20 至 60 個交易日。

MVP 小規模測試建議先採第 1 條；正式 demo 或投資研究展示建議做第 2 條。

## 歷史行情回補

已新增 `market-data-backfill` Edge Function，可從 TWSE / TPEx 官方歷史 JSON 端點回補近期交易日資料。

部署 function 後執行：

```powershell
npm run market:backfill
```

預設行為：

- 目標回補 25 個有效交易日。
- 每批掃描 5 個日曆日。
- 假日、休市或官方端點無資料會自動跳過。
- 每批回補後會自動嘗試執行 `score-calculate`。

可調整參數：

```powershell
$env:JASIC_BACKFILL_TRADING_DAYS="60"
$env:JASIC_BACKFILL_BATCH_DAYS="5"
$env:JASIC_BACKFILL_MAX_BATCHES="24"
npm run market:backfill
```

回補成功且每檔股票累積至少 20 個交易日後，`score-calculate` 會產生：

- `stock_features_daily`
- `stock_score_snapshots`
- `market_score_snapshots`
- `discovery_runs`
- `discovery_candidates`
