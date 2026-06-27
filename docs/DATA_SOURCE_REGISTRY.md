# JASIC Data Source Registry

Date: 2026-06-27

This registry is the operational checklist for Phase 3 data ingestion. It separates sources that are already wired into the MVP ingestion adapter layer from sources that are intentionally blocked until licensing, endpoint, and redistribution rules are confirmed.

## Production-ready adapter sources

These sources are allowed to produce `MarketDataAdapterBatch` rows in `market-data-ingest`.

| Code | Provider | Domain | Frequency | Current use |
| --- | --- | --- | --- | --- |
| `TWSE_STOCK_DAY_ALL` | Taiwan Stock Exchange | Daily price | Trading-day EOD | Listed stock master + daily quote ingestion |
| `TWSE_T86` | Taiwan Stock Exchange | Institutional flow | Trading-day EOD | Listed foreign / investment trust / dealer flow ingestion |
| `TPEX_DAILY_QUOTES` | Taipei Exchange | Daily price | Trading-day EOD | TPEx stock master + daily quote ingestion |
| `TPEX_3INSTI` | Taipei Exchange | Institutional flow | Trading-day EOD | TPEx foreign / investment trust / dealer flow ingestion |

Implementation files:

- `supabase/functions/_shared/marketDataContracts.ts`
- `supabase/functions/_shared/taiwanMarketAdapters.ts`
- `supabase/functions/market-data-ingest/index.ts`
- `tests/market-data-contracts.test.ts`
- `tests/taiwan-market-adapters.test.ts`

## Pending sources

These sources are required for the full JASIC scoring model, but they must remain blocked from production ingestion until a permitted provider is chosen and documented.

| Code | Needed for | Current status |
| --- | --- | --- |
| `TAIWAN_MARGIN_TRADING` | Margin balance, leverage pressure, risk alerts | Pending licensing / endpoint review |
| `TAIWAN_OPEN_INTEREST` | Options / futures OI pressure and trend confirmation | Pending licensing / endpoint review |
| `JASIC_MACRO_FIVE` | Five macro indicators and Market Score | Pending provider-by-provider review |

## Quality gate

Run this before changing data ingestion, source metadata, or scoring dependencies:

```bash
npm run doctor:data-sources
```

The doctor checks:

- Official Taiwan source codes match the expected adapter registry.
- Official sources have HTTPS endpoints, attribution, and commercial-use notes.
- Pending sources remain `pending_review`.
- Taiwan adapter exports are present.
- `market-data-ingest` is wired through the shared adapter batches.
- Data-source documentation covers each source code.

## Next source approval checklist

Before moving a pending source into production ingestion:

1. Confirm official or licensed provider.
2. Record provider, endpoint, attribution, frequency, and commercial-use note.
3. Add a parser that returns `MarketDataAdapterBatch<TRecord>`.
4. Add tests covering valid rows, rejected rows, and empty upstream payloads.
5. Add an `ingestion_runs` status path via `ingestionRunFromBatch`.
6. Surface health and latest dataset timestamp in Data Health Operations.
