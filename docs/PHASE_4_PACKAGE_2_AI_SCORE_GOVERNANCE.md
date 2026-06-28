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

1. Add score rule registry for market score and stock score versions.
2. Add report/export audit fields for AI governance metadata.
3. Add staging smoke assertions for AI Check metadata after Supabase credentials are available.
