# JASIC Alpha Privacy and Data Lifecycle

This document is an engineering baseline for Alpha testing. It is not a substitute for legal review.

## Data collected

JASIC may store:

- authentication email and account identifier;
- display name, risk preference and default investment horizon;
- watchlists and alert preferences;
- user-entered research positions, including average cost, quantity, horizon and note;
- user-entered AI Check position inputs;
- AI Check conclusions, reasons, risks and suggestions;
- read/unread alert state;
- personal reports created for the user;
- terms version and acceptance timestamp.

JASIC does not store brokerage passwords and does not submit trades.

Portfolio market value and unrealized profit/loss are derived from user-entered
research positions and the latest available end-of-day close. They are not
broker statements, real-time quotes or executable balances.

## Market and system data

Public market prices, institutional flows, score snapshots, Discovery rankings and public reports are system datasets rather than user-owned personal data.

Every decision output should retain:

- source data timestamp;
- rule version;
- prompt and model identifier when AI was used;
- confidence and known missing dimensions.

## User data export

The Settings → Privacy Center export includes:

- profile and accepted terms;
- watchlists;
- research positions;
- AI Check history;
- alerts and alert rules;
- personal reports.

The export is JSON and includes a schema version and export timestamp.

## Account deletion

The user must be authenticated and type the exact phrase:

```text
DELETE JASIC ACCOUNT
```

Deletion removes the Supabase Auth account. Foreign-key cascades remove profile, watchlists, research positions, AI Check history, alert rules, alerts and personal reports.

The system retains only a non-identifying deletion audit containing:

- SHA-256 hash of the former internal user UUID;
- random deletion request ID;
- deletion scope;
- request and completion timestamps.

Raw email and raw user UUID are not retained in the deletion audit.

## Retention

- Personal data: retained until account deletion or an approved policy limit.
- Public market snapshots: retained according to data licensing and system calibration needs.
- AI operational logs: must avoid unnecessary personal data and follow an approved retention window.
- Deletion audit: retain only as long as operational or legal requirements justify.

## Required legal decisions before public launch

- final privacy policy controller/contact identity;
- applicable Taiwan and international privacy obligations;
- minimum age and parental consent rules;
- approved retention periods;
- cross-border processing disclosures for Supabase and OpenAI;
- data licensing and redistribution terms;
- support channel for access, correction and deletion requests.
