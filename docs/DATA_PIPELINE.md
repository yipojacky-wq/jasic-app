# JASIC Market Data Pipeline

## Scope

The current pipeline is end-of-day research infrastructure, not real-time quote distribution.

Official source adapters:

| Dataset | Provider | Endpoint |
|---|---|---|
| TWSE daily stock quotes | Taiwan Stock Exchange | `openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL` |
| TWSE institutional flow | Taiwan Stock Exchange | `twse.com.tw/rwd/zh/fund/T86` |
| TPEx daily close quotes | Taipei Exchange | `tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes` |
| TPEx institutional flow | Taipei Exchange | `tpex.org.tw/openapi/v1/tpex_3insti_daily_trading` |

The adapters retain common four-digit equity symbols for the first MVP. ETFs, warrants, bonds and other instruments are intentionally excluded until their product rules are defined.

## Date handling

TWSE and TPEx OpenAPI responses use ROC calendar dates such as `1150618`. The ingestion function converts them to ISO dates such as `2026-06-18`.

The pipeline always trusts the dataset date returned by the official source. It never assumes that the current calendar date is a trading date. This protects weekends, holidays and delayed releases from creating false records.

## Initial history requirement

The official bulk OpenAPI adapters in this repository provide the latest end-of-day snapshot. The provisional feature engine requires 20 stored trading sessions.

For a new production database, choose one of these paths:

1. Run the daily pipeline until 20 sessions have accumulated.
2. Import a licensed bulk historical dataset into `stock_daily_prices` and `institutional_flows_daily`.
3. Build a rate-limited historical backfill adapter after confirming the provider's commercial-use and redistribution terms.

Do not launch Top 20 as a production claim with fewer than 20 valid sessions. `score-calculate` returns `INSUFFICIENT_DATA` instead of manufacturing a score.

## Functions

### `market-data-ingest`

1. Fetches TWSE and TPEx daily quotes.
2. Resolves the official dataset dates.
3. Fetches institutional flows for the same source date.
4. Upserts stock master records.
5. Upserts daily prices and institutional flows.
6. Records counts and status in `ingestion_runs`.

### `score-calculate`

1. Requires at least 20 sessions of stored price history.
2. Calls `calculate_stock_features`.
3. Calculates market breadth and volatility.
4. Creates `market_score_snapshots`.
5. Creates versioned `stock_score_snapshots`.
6. Creates a Discovery run and Top 20 candidates.

### `alert-evaluate`

Runs after score calculation and checks each tracked stock against the user's enabled alert rules:

- absolute Score Change threshold;
- signal transition;
- risk score crossing its configured threshold.

Alerts use a deterministic deduplication key containing user, stock, rule type and score timestamp. Re-running the job therefore does not create duplicate notifications.

### `report-generate`

Runs after scores and alerts:

- Daily Market Report from the latest market snapshot.
- Weekly Core Pool Report from the latest Discovery Top 20.
- Stock War Room Report for the current highest-ranked candidate.
- Risk Alert Report from market risk and candidate risk flags.

Every report has a stable `report_key`. Re-running the same data and rule version updates the existing report instead of creating duplicates. Report content stores metrics, sections, disclaimer, data timestamp and rule version.

## Security

Both scheduled functions require:

```http
x-cron-secret: <CRON_SECRET>
```

Set the same value in Supabase and GitHub:

```bash
supabase secrets set CRON_SECRET=...
```

GitHub repository secrets:

- `SUPABASE_URL`
- `CRON_SECRET`

The service-role key is not stored in GitHub Actions. Edge Functions receive it from the Supabase runtime.

## Provisional score warning

`stock-score-provisional-0.1.0` is an engineering validation formula. It is deterministic and testable, but it is not the final JASIC Score Constitution.

Current limitations:

- Chip Score is held at a neutral placeholder value.
- OI Score is held at a neutral placeholder value.
- Confidence is reduced because verified chip concentration and individual-stock OI are missing.
- The formula must be replaced or approved after JASIC weights, thresholds and calibration cases are supplied.

The provisional rule version is stored on every score, market snapshot and Discovery run so it cannot silently mix with future production rules.
