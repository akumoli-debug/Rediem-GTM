# Security

GTM Engine handles company research, people data, provider responses, email verification outcomes, CRM mappings, and API credentials. Treat all workspace data as sensitive.

## Secrets

- Store secrets in environment variables.
- Do not commit `.env`.
- Do not paste provider tokens into code, tests, docs, screenshots, or issue reports.
- Use separate credentials for local development, staging, and production.
- Rotate credentials if they are exposed.

Configured secrets may include:

- `DATABASE_URL`
- `REDIS_URL`
- `MCP_RESEARCH_SERVER_COMMAND`
- `MCP_RESEARCH_SERVER_ARGS`
- Provider API keys
- CRM access tokens and OAuth credentials

## Logs

Do not log:

- API keys
- Access tokens
- Refresh tokens
- Full authorization headers
- Raw secrets embedded in provider arguments
- Private CRM credentials

ProviderResult rows may store raw and normalized provider outputs. Before enabling live providers, review what each adapter stores and redact sensitive payloads where needed.

Provider result payloads pass through a redaction helper before persistence. The helper removes values from common secret-bearing keys and token-like string patterns. Continue to review new provider adapters because provider-specific payloads can introduce new secret shapes.

## Provider Data Handling

- Keep provider-specific raw payloads separate from normalized fields.
- Preserve evidence, source URLs, confidence, and captured timestamps for claims used in scoring or outreach drafting.
- Avoid storing unnecessary personal data.
- Respect provider terms, robots rules, rate limits, and data retention requirements.
- Use cache TTLs appropriate for the data type.

## Compliance Reminders

This codebase is infrastructure, not legal advice. Before using live data:

- Confirm your lawful basis for processing personal data.
- Honor deletion, suppression, and do-not-contact requests.
- Keep a suppression list for role-based, invalid, risky, and disallowed addresses.
- Review applicable email, privacy, employment, and sector-specific rules.
- Ensure CRM sync behavior matches internal data governance policies.

## Outreach Safety

- Do not automate spam.
- Do not send messages from this system without a separate compliant sending workflow.
- Treat generated outreach angles as research drafts only.
- Use evidence-backed claims and source URLs.
- Return insufficient evidence rather than inventing personalization.
- Mark outbound-ready only when email status is `VERIFIED`.
- Do not treat `RISKY`, `CATCH_ALL`, `UNKNOWN`, `INVALID`, or `SUPPRESSED` as sequence-ready.

## Formula Safety

Formulas are parsed and evaluated by a safe local evaluator:

- No JavaScript `eval`
- No `new Function`
- No filesystem access
- No network access
- No process access
- No arbitrary global objects

Invalid formulas should fail with helpful errors rather than executing unsafe behavior.

## CRM Sync Safety

- Dry-run CRM sync before live mutation.
- Use `BLANK_ONLY` by default.
- Do not overwrite manually edited CRM fields unless explicitly enabled.
- Keep source URLs and confidence values with synced fields where possible.
- Prefer CSV fallback until live CRM credentials and mappings have been reviewed.

## Live Eval Safety

Mock evals are safe by default. Live evals require:

```bash
EVAL_LIVE=true npm run eval
```

Live evals may call configured providers and incur cost. Do not enable live evals in CI unless you intentionally provide credentials and budgets.
