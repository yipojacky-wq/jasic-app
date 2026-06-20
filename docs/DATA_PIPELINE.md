# JASIC Market Data Pipeline

## Scope

The current pipeline is end-of-day research infrastructure, not real-time quote distribution.

## Macro Dashboard contract

The Macro Dashboard exposes more than a headline score. Every indicator response includes:

- provider and source label;
- observation date and release timestamp;
- expected update cadence;
- freshness status and age in days;
- plain-language market impact;
- six normalized historical observations for directional context.

Market Score responses also expose breadth, volatility, confidence, data
timestamp and rule version. This makes the displayed signal auditable and
prevents a stale value from appearing equivalent to a current observation.

The repository currently contains the data definitions, demo seed values,
freshness rules and response contract for the five macro indicators. It does
not yet contain production ingestion adapters for every macro provider.
Before production use, connect each definition to an official or licensed
source whose commercial-use, caching and redistribution terms have been
reviewed. Demo and seed values must never be presented as live investment
data.

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

Each candidate stores and exposes:

- layer-by-layer pass, caution or reject status;
- market, institution, technical and risk scores used by the funnel;
- deterministic ranking reasons;
- known risk flags;
- confidence, data timestamp and rule version.

The client may search, filter and reorder the returned candidate set. Client
sorting does not change the original deterministic rank saved by the pipeline.

### `alert-evaluate`

Runs after score calculation and checks each tracked stock against the user's enabled alert rules:

- absolute Score Change threshold;
- signal transition;
- risk score crossing its configured threshold.

User-configurable global thresholds are normalized before evaluation:

- Score Change: 1 to 25 points, default 5.
- Risk Score: 40 to 95, default 70.
- Signal Change: enabled or disabled; every signal transition is evaluated.

Threshold configuration changes affect future evaluations only. They do not
rewrite or delete alerts that were already generated.

Alerts use a deterministic deduplication key containing user, stock, rule type and score timestamp. Re-running the job therefore does not create duplicate notifications.

### AI Check input guardrails

AI Check uses the same deterministic validator in the client and Edge
Function. The database adds a final constraint layer. Accepted inputs are:

- four-digit MVP common-stock symbols;
- cost from 0.01 to 1,000,000 TWD;
- quantity from 0.001 to 10,000 Taiwan lots;
- `short`, `swing`, `medium` or `long` investment horizon;
- `conservative`, `balanced`, `aggressive` or `growth` risk profile;
- estimated cost basis no greater than 10 billion TWD.

One Taiwan lot is converted to 1,000 shares. The cost-basis preview is
user-entered cost multiplied by shares; it is not a quote, broker balance or
market valuation. Invalid input is rejected before an OpenAI request is made.

### `report-generate`

Runs after scores and alerts:

- Daily Market Report from the latest market snapshot.
- Weekly Core Pool Report from the latest Discovery Top 20.
- Stock War Room Report for the current highest-ranked candidate.
- Risk Alert Report from market risk and candidate risk flags.

Every report has a stable `report_key`. Re-running the same data and rule version updates the existing report instead of creating duplicates. Report content stores metrics, sections, disclaimer, data timestamp and rule version.

### `data-health`

The authenticated operations view combines the latest ingestion run for every
active source with the latest Score and report timestamps. Each source exposes:

- latest dataset and execution timestamps;
- completed, partial, failed or running state;
- received, valid and rejected record counts;
- valid-record quality rate;
- upstream error summary when available;
- a deterministic operational next action.

Stale and missing items are treated as research blockers. Warning items remain
visible as attention items but do not automatically block all research. AI and
human interpretation must still respect the timestamp and confidence attached
to each output.

The quality rate is an ingestion-validity measure, not a claim that the source
data is economically correct. Source reconciliation and anomaly monitoring are
separate production controls.

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
