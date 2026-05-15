# Evals

The eval framework measures GTM enrichment quality using golden datasets and the real workflow code path.

## Files

```text
evals/
  golden_accounts.json
  golden_people.json
  expected_signals.json
  runEval.ts
  reports/latest.md
```

## Running Evals

Mock evals are the default and require no live provider credentials:

```bash
npm run eval
```

The report is written to:

```text
evals/reports/latest.md
```

## Live Evals

Live research evals are opt-in only:

```bash
EVAL_LIVE=true npm run eval
```

Live mode should only be used when the configured research provider is ready and cost controls are understood. Do not run live evals in CI by default.

## Metrics

The eval runner computes:

- `company_match_accuracy`
- `account_field_fill_rate`
- `decision_maker_precision_at_5`
- `verified_email_rate`
- `signal_relevance_score`
- `source_coverage_rate`
- `hallucination_rate`
- `cost_per_successful_account`
- `latency_per_account`
- `workflow_failure_rate`

## Golden Account Format

```json
{
  "domain": "example.com",
  "expectedCompanyName": "Example Company",
  "expectedPersonas": ["RevOps", "VP Sales"],
  "expectedSignalTypes": ["HIRING", "PRODUCT_LAUNCH"],
  "mustNotClaim": ["recent funding if none found"]
}
```

The current mock eval dataset includes domains, expected company names, expected personas, expected signal types, and disallowed claims.

## CI

The CI workflow runs mock evals:

```bash
npm run eval
```

This keeps the quality harness exercised without spending provider budget or requiring live secrets.

## Interpreting Reports

Reports include:

- Metric table
- Dataset size
- Account-level enrichment counts
- Provider call count
- Workflow failures

Mock eval scores are best used to detect regressions in workflow wiring, evidence capture, scoring, and persistence. Live evals are better suited for measuring provider quality.
