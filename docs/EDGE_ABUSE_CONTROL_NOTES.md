# JASIC Edge Abuse-Control Notes

Date: 2026-07-11

These notes define production-hardening expectations for Supabase Edge Functions before public or semi-public staging.

## Current guardrails

- Authenticated user functions require JWT.
- Scheduled pipeline functions require `CRON_SECRET`.
- AI Check validates structured input before calling OpenAI.
- AI Check validates structured output before persisting results.
- AI Check blocks profit guarantees and automatic-trading claims.
- Data-health and smoke scripts validate response shape.

## Functions that should remain authenticated

- `ai-check`
- `ai-check-history`
- `data-health`
- `portfolio-summary`
- `profile-settings`
- `report-detail`
- `reports-latest`
- `stock-war-room`
- `user-data-export`
- `watchlist-summary`
- `account-delete`

## Functions that require service or cron protection

- `market-data-ingest`
- `score-calculate`
- `report-generate`
- `alert-evaluate`

These functions must not be exposed as ordinary public user actions.

## Future rate-limit recommendation

The first policy skeleton is defined in:

```text
supabase/functions/_shared/edgeRateLimit.ts
```

It is tested by:

```text
tests/edge-rate-limit.test.ts
```

The first persistent database gate is defined in:

```text
supabase/migrations/20260711000100_edge_rate_limits.sql
```

These Edge Functions now call `consume_edge_rate_limit` before expensive or destructive actions:

- `ai-check`: before calling OpenAI or writing AI Check request/result rows
- `user-data-export`: before querying and returning the export payload
- `account-delete`: before writing deletion audit and deleting the user

`report-generate` remains protected by `CRON_SECRET` because it is a scheduled/service function rather than an ordinary user action.

The per-user and per-function rate-limit table is:

```text
edge_rate_limits
- id
- user_id
- function_name
- window_start
- request_count
- created_at
- updated_at
```

Suggested first limits:

- AI Check: 20 requests / user / hour
- Report generation: 10 requests / user / day
- Data export: 5 requests / user / day
- Account deletion: exact confirmation phrase plus single active request

## Abuse response policy

If a user exceeds limits:

- return `429`
- do not call OpenAI
- do not write partial AI results
- include a safe retry-after message

## Secret hygiene

- Never expose Supabase service-role key to client builds.
- Never expose OpenAI API key through `EXPO_PUBLIC_*`.
- Keep `CRON_SECRET` server-side only.
