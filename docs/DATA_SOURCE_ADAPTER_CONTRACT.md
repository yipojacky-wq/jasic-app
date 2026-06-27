# Data Source Adapter Contract

日期：2026-06-27  
階段：Phase 3 — 正式資料源與資料健康

本文件定義 JASIC 後續接正式資料源時的 adapter contract。目的不是先把所有資料源接完，而是先建立一致的資料邊界：每個來源都必須說清楚資料日期、授權狀態、筆數、品質率、警告與 attribution。

---

## 1. Shared contract

程式位置：

```text
supabase/functions/_shared/marketDataContracts.ts
```

測試位置：

```text
tests/market-data-contracts.test.ts
```

主要型別：

- `MarketDataSourceContract`
- `MarketDataAdapterBatch<TRecord>`
- `MarketDataAdapterSummary`

主要 helper：

- `createAdapterBatch`
- `summarizeAdapterBatch`
- `ingestionRunFromBatch`
- `adapterStatus`
- `qualityRate`

---

## 2. Adapter 必填欄位

每個正式資料源都必須定義：

- `code`
- `provider`
- `datasetName`
- `domain`
- `frequency`
- `licenseStatus`
- `attribution`
- `commercialUseNote`
- `endpoint`，若有固定 endpoint

---

## 3. 授權狀態規則

允許：

- `official_open_data`
- `licensed`
- `internal`

禁止直接進入 production ingestion：

- `pending_review`

`createAdapterBatch` 會直接阻擋 `pending_review` 的來源，避免尚未審查授權條款的資料被當成正式研究輸出。

---

## 4. 已定義的官方台股來源

目前已列入 contract：

- `TWSE_STOCK_DAY_ALL`
- `TWSE_T86`
- `TPEX_DAILY_QUOTES`
- `TPEX_3INSTI`

這些可支撐 MVP 第一階段：

- 個股基本資料
- 日行情
- 法人買賣超

正式 launch 前仍需複核商用、快取與再散布條款。

---

## 5. 尚待來源確認

目前列為 `pending_review`：

- `TAIWAN_MARGIN_TRADING`
- `TAIWAN_OPEN_INTEREST`
- `JASIC_MACRO_FIVE`

這些資料不得在未確認來源與授權前接入 production scoring。

---

## 6. Ingestion status mapping

Adapter status：

| Status | 意義 |
|---|---|
| `completed` | 有資料、無 rejected、無 warning。 |
| `partial` | 有有效資料，但有 rejected 或 warning。 |
| `blocked` | 上游回傳 0 筆或有效資料為 0。 |
| `failed` | 上游錯誤或 adapter 例外。 |

寫入 `ingestion_runs` 時：

- `blocked` 會轉成 `failed`
- warnings 會合併到 `error_summary`

---

## 7. 下一步實作順序

1. 把 `market-data-ingest` 內既有 TWSE / TPEx parsing 拆成 adapter functions。
2. 每個 adapter 回傳 `MarketDataAdapterBatch`。
3. 用 `ingestionRunFromBatch` 產生 `ingestion_runs`。
4. 替法人 / 融資券 / OI / macro 逐一補 adapter。
5. Data Health Center 改讀統一的 source contract metadata。

