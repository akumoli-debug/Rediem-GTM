# GTM Engine TODO

## Phase 0: Project Bootstrap

- Initialize the TypeScript project structure.
- Choose whether to start with a single Next.js app or a lightweight workspace layout.
- Add package metadata with generic product naming.
- Add `.env.example` with Postgres, Redis, queue, and provider configuration placeholders.
- Add linting, formatting, typecheck, and basic test scripts.
- Initialize Git if this workspace will become the working repository.

## Phase 1: Data Model

- Add Prisma and Postgres configuration.
- Define initial models for workspaces, lists, accounts, contacts, enrichment runs, jobs, provider calls, evidence, formulas, and exports.
- Add migrations and seed data for local development.
- Create typed data access helpers for common account and enrichment operations.

## Phase 2: CSV Import and Export

- Implement CSV parsing with header detection, row validation, and column mapping.
- Support account import with normalized fields such as company name, domain, LinkedIn URL, industry, employee count, and notes.
- Store raw imported rows for traceability.
- Add CRM-ready CSV export with selected account, contact, score, and evidence columns.

## Phase 3: Queue Foundation

- Define a queue interface for enrichment jobs.
- Implement an in-memory queue adapter for tests and local development.
- Add BullMQ and Redis adapter for production-like runs.
- Track job lifecycle states, retries, errors, and cancellation.

## Phase 4: Provider Adapter Layer

- Define normalized provider request and response types.
- Add interfaces for account enrichment, contact enrichment, buying committee discovery, web research, and MCP provider execution.
- Implement a mock provider for deterministic local development.
- Add provider call logging with cost estimates, request ids, raw payload references, confidence, and evidence.

## Phase 5: Formula Engine

- Choose or implement a safe expression parser.
- Add deterministic helpers for strings, numbers, dates, arrays, booleans, domains, and URLs.
- Evaluate formulas against account/contact rows and enrichment fields.
- Version formula definitions and store evaluation outputs.
- Add tests for formula safety and expected scoring behavior.

## Phase 6: First UI Slice

- Build the Next.js App Router shell.
- Add list creation and CSV import flow.
- Add account table with normalized fields, formula columns, enrichment status, and evidence indicators.
- Add enrichment run setup with provider selection, waterfall order, confidence threshold, and spend limit.
- Add run history and job status views.

## Phase 7: Account Intelligence Workflow

- Implement account enrichment waterfall.
- Add buying committee discovery jobs.
- Normalize evidence and citations across provider responses.
- Add signal scoring from formulas and provider outputs.
- Add export flow for enriched accounts and contacts.

## Phase 8: Production Hardening

- Add authentication and workspace authorization.
- Add observability for jobs, provider latency, errors, cost, and retries.
- Add rate limiting and provider-level circuit breakers.
- Add budget enforcement and dry-run estimates.
- Add integration tests around import, enrichment, formula evaluation, and export.
- Add deployment documentation.

## Near-Term Non-Goals

- Do not build a broad provider marketplace yet.
- Do not add multi-tenant billing until core enrichment workflows are proven.
- Do not vendor external provider implementations.
- Do not create public-facing copy that references upstream projects.
- Do not over-optimize the queue layer before the first enrichment slice exists.
