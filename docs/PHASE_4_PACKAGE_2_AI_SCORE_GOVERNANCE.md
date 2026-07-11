# Phase 4 Package 2: AI Check / Score Governance

Date: 2026-06-28

Status: In progress.

Package 2 hardens the JASIC decision layer so AI Check and score output can be audited before real investor-facing use.

## Package objective

Make every AI Check result traceable to:

- source data timestamp
- score rule version
- AI prompt version
- AI response schema version
- model identifier
- allowed action guardrail
- final validated structured result

## First implementation slice

Completed in this slice:

- Added shared AI governance module:

```text
supabase/functions/_shared/aiGovernance.ts
```

- Centralized:
  - AI Check prompt version
  - AI Check response schema version
  - allowed action rules
  - JSON schema for OpenAI structured output
  - prohibited claim detection
  - structured result validation

- Updated `ai-check` Edge Function to:
  - use the shared response schema
  - build an auditable governance snapshot
  - reject output that violates allowed actions
  - reject output containing profit guarantees or automatic-trading claims
  - return prompt and response schema versions in response metadata
  - persist response schema version and allowed actions to `ai_check_results`

- Updated AI Check history to return and display:
  - model identifier
  - prompt version
  - response schema version
  - rule version
  - allowed action guardrail

- Updated export/share surfaces:
  - `user-data-export` includes `response_schema_version` and `allowed_actions`
  - AI Check share text includes model, prompt version, schema version and allowed actions
  - report detail can carry optional `governanceAudit`
  - report Markdown export preserves AI model, prompt version, schema version and allowed actions when present
  - report Markdown export has a clean `Audit` section and disclaimer

- Updated staging smoke:
  - `npm run smoke:live-readiness` validates AI Check governance metadata when `JASIC_STAGING_ACCESS_TOKEN` is provided

- Added score rule registry:

```text
supabase/functions/_shared/scoreRuleRegistry.ts
```

- Current staging rule versions:
  - `market-score-provisional-0.1.0`
  - `stock-score-provisional-0.1.0`
  - `discovery-funnel-provisional-0.1.0`

- Added Supabase `rule_versions` seed migration for:
  - `market_score`
  - `discovery_funnel`

- Updated `score-calculate` to use registry versions instead of local hard-coded constants.

- Added doctor:

```bash
npm run doctor:score-governance
```

- Added tests:

```text
tests/ai-governance.test.ts
```

- Added doctor:

```bash
npm run doctor:ai-governance
```

## Guardrail policy

AI Check must never:

- guarantee profit
- imply risk-free returns
- place trades
- automate trades
- claim an order has been sent

When market regime, risk score, confidence, or user risk profile is unfavorable, allowed actions become more defensive.

## Remaining Package 2 work

1. Run staging smoke assertions against a real Supabase project after credentials are available.
