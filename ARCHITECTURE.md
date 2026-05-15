# Architecture

GTM Engine is a Next.js and TypeScript application for evidence-backed account enrichment. The system is organized around provider-neutral workflows, normalized data, source evidence, scoring, cost controls, and CRM-ready exports.

## Stack

- TypeScript
- Next.js App Router
- Postgres
- Prisma ORM
- Provider adapter interfaces
- Safe formula parser and evaluator
- CSV import/export
- In-process workflow execution today, with queue interfaces ready for Redis-backed workers later

## Source Layout

```text
src/
  app/                    Next.js pages and API routes
  components/             Workspace table UI, drawers, galleries, shared UI
  lib/                    App-level helpers
  server/
    cache/                Provider call cache helpers
    crm/                  CRM provider abstractions, mapping, sync rules
    db/                   Prisma client
    evidence/             Evidence-first field persistence helpers
    exports/              CSV export builders
    formulas/             Parser, evaluator, functions, templates, service
    imports/              CSV import preview and account creation
    observability/        Run, provider, budget, and fill-rate metrics
    playbooks/            Saved GTM playbook examples and services
    providers/            Provider interfaces, registry, mock and MCP adapters
    queue/                Queue abstraction placeholder
    scoring/              Signal and title/persona scoring
    workflows/            Account, committee, contact, waterfall, outreach workflows
    workspace/            Server-side table data loaders
  types/                  Shared exported types
prisma/
  schema.prisma
  migrations/
  seed.ts
evals/
  golden_accounts.json
  golden_people.json
  expected_signals.json
  runEval.ts
```

## Data Model

Core Prisma models:

- `Workspace`: tenant boundary for accounts, people, signals, evidence, runs, formulas, playbooks, and provider results.
- `Account`: company-level profile, enrichment summaries, scores, and timestamps.
- `Person`: buying committee/contact record with persona, role score, email status, and contactability score.
- `Signal`: account-level events such as hiring, funding, product launch, compliance, pricing, and news.
- `Evidence`: field-level provenance for account, person, signal, and formula result claims.
- `WorkflowRun`: run status, counts, cost, timing, and errors.
- `ProviderResult`: provider call audit log with raw/normalized response, cost, latency, cache status, and error details.
- `FormulaColumn` and `FormulaResult`: safe computed columns and evaluated values.
- `FormulaTemplate`: reusable template formulas that can be added to a workspace.
- `CacheEntry`: provider call cache by namespace and normalized key.
- `Playbook`: saved GTM motions with personas, signal rules, workflow steps, formulas, exports, and budgets.

## Workflow Layer

Workflows use narrow client interfaces so they can run against Prisma in production and in-memory clients in tests/evals.

- `researchAccount`: canonicalizes domain, checks cache, enriches company fields, scrapes/extracts website pages, searches recent events, stores evidence, creates signals, scores account, and caches the dossier.
- `resolveBuyingCommittee`: loads or researches an account, derives role hints from motion/playbook, calls people providers, normalizes titles, scores people, stores evidence, and groups personas.
- `enrichContacts`: verifies existing emails, calls contact providers, generates candidate patterns, verifies candidates, updates contactability, and preserves evidence.
- `generateOutreachAngles`: generates conservative evidence-backed outreach angles only when Account/Person, Signal, and Evidence rows support the claim.
- `runWaterfall`: reusable ordered-step enrichment engine with conditions, stop rules, retries, cost limits, cache hooks, and ProviderResult persistence.

## Provider Layer

Application logic depends on interfaces in `src/server/providers/types.ts`, not vendor-specific APIs.

Provider categories:

- Company enrichment
- People discovery
- Contact enrichment
- Email verification
- Web research
- Browser/style inspection

Adapters include:

- `MockProvider` for local development, tests, CI, and evals.
- `MCPResearchProvider` for configured external MCP research provider commands.
- Stubs for CRM providers where OAuth or API-specific implementation is intentionally deferred.

## Evidence Model

Every enriched field should preserve:

- `value`
- `sourceUrl`
- `provider`
- `confidence`
- `capturedAt`
- `rawExcerpt` when available

Default overwrite policy is `BLANK_ONLY`. Workflows can opt into `HIGHER_CONFIDENCE`, `ALWAYS`, or `NEVER` for specific behavior.

## Formula System

The formula system parses expressions into an AST and evaluates them against a bounded context. It does not use JavaScript `eval` or `new Function`.

Formula scopes:

- `ACCOUNT`
- `PERSON`

Signal summary fields are available to both account and person contexts when an account can be resolved.

## Cost, Cache, and Observability

Provider calls are logged in `ProviderResult`. Expensive calls can be wrapped in `withCache`, using `CacheEntry` namespaces and TTLs. Run dashboards calculate cost, latency, cache hit rate, success/failure rates, and provider health.

Budget controls support:

- Max cost per account
- Max cost per contact
- Max total run cost
- Stop-on-budget-exceeded behavior

## Third-Party Code

No substantial third-party source code is vendored in this repo. Runtime dependencies are installed through package management. If future work copies substantial MIT-licensed source into the repository, add `THIRD_PARTY_NOTICES.md` with the required copyright and license text.
