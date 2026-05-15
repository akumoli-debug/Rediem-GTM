# Environment

Copy `.env.example` to `.env`.

```bash
cp .env.example .env
```

No secrets are committed. Keep all live provider, CRM, n8n, and sequencer credentials in environment variables.

## Required For Database-Backed Development

```bash
DATABASE_URL=
```

Example local Postgres shape:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rediem_gtm?schema=public
```

## Local Mock Mode

```bash
GTM_ENGINE_RESEARCH_PROVIDER=mock
MCP_RESEARCH_MOCK_RESPONSES=true
```

Use mock mode for local tests, CI, and demos without live provider spend.

## Configured Research Provider

```bash
GTM_ENGINE_RESEARCH_PROVIDER=mcp
MCP_RESEARCH_SERVER_COMMAND=
MCP_RESEARCH_SERVER_ARGS=
MCP_RESEARCH_MOCK_RESPONSES=false
```

The adapter boundary is generic. Product-facing docs should call this a configured research provider or external MCP research provider.

## Optional Research Keys

```bash
FIRECRAWL_API_KEY=
APIFY_TOKEN=
BROWSERBASE_API_KEY=
BROWSERBASE_PROJECT_ID=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

These are optional. Do not claim live provider coverage unless the corresponding adapter is implemented and configured.

## Optional People And Contact Keys

```bash
APOLLO_API_KEY=
PEOPLE_DATA_LABS_API_KEY=
HUNTER_API_KEY=
ZEROBOUNCE_API_KEY=
```

Use these only for live buyer/contact enrichment. Outbound handoff should remain verified-email-only.

## CRM And Orchestration Keys

```bash
HUBSPOT_ACCESS_TOKEN=
SALESFORCE_CLIENT_ID=
SALESFORCE_CLIENT_SECRET=
SALESFORCE_REFRESH_TOKEN=
N8N_WEBHOOK_URL=
SMARTLEAD_API_KEY=
INSTANTLY_API_KEY=
```

CRM sync should default to dry-run and blank-only overwrites. Sequencer export should require verified email.

## Redis

```bash
REDIS_URL=
```

Redis is optional today. The queue abstraction is present for future Redis-backed workflow workers.

## Evals

```bash
EVAL_LIVE=false
```

Live evals must be opt-in. Mock evals are safe for CI.

## Secret Handling

- Do not commit `.env`.
- Do not log provider tokens.
- Keep n8n credentials in n8n credential storage.
- Keep sequencer API keys outside exported payloads.
- Redact bearer tokens and token-like fields in provider logs.
