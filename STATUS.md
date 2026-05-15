# Rediem GTM Intelligence Status

Last reviewed: 2026-05-15

## Verification

| Check | Status | Notes |
| --- | --- | --- |
| `npm run db:generate` | Passed | Prisma Client generated to `src/generated/prisma`. |
| `npm run lint` | Passed | ESLint completed with `--max-warnings=0`. |
| `npm run build` | Passed | Next.js production build and TypeScript checks completed successfully. |
| `npm run test` | Passed | 182 tests passed. |
| `npx prisma migrate status` | Not rerun in this pass | Requires a reachable Postgres database matching `DATABASE_URL`. Earlier stabilization noted local Postgres was unavailable. |

## Repo Structure

- `prisma/`: schema, migrations, and seed data.
- `src/app/`: Next.js app router pages, including Rediem cockpit pages under `/rediem`.
- `src/components/rediem/`: Rediem-specific UI components.
- `src/server/scoring/`: signal, title, and Rediem scoring.
- `src/server/workflows/`: account research, Rediem brand analysis, Rediem buying committee, activation ideas, enrichment, and tracking.
- `src/server/formulas/`: safe parser/evaluator, formula services, and templates.
- `src/server/evidence/`: evidence-first persistence helpers.
- `src/server/providers/`: provider interfaces, registry, mock provider, generic MCP adapter boundary, and redaction.
- `test/`: mock-first unit and workflow tests.

## Phase Map

| Phase | Status | Implementation Notes |
| --- | --- | --- |
| Stabilization | Complete | Build, lint, tests, and Prisma generate pass. Status and backlog now reflect the Rediem pivot. |
| Prisma schema | Complete | `BrandProfile`, `BrandActivationIdea`, and `CompetitorToolDetection` exist with relationships from `Workspace` and `Account`. |
| Seed script | Complete | Seed creates sample beauty, beverage, and apparel consumer brands with BrandProfile, detections, evidence, signals, and activation ideas. |
| Rediem scoring | Complete | `src/server/scoring/rediem.ts` implements fit, loyalty pain, community readiness, migration pain, agentic commerce, tiering, component breakdowns, and reasons. |
| Rediem formula templates | Complete | Rediem Tier, Points Loyalty Migration, Community Gap, Review Activation Fit, Subscription Retention Fit, Retail-to-DTC Fit, Agentic Commerce Angle, and AE Priority are installed as templates. |
| Community Flywheel Ratio | Complete | Prisma models, scoring heuristics, CFR tiers, leak detection, play recommendations, explanations, and formula templates are implemented. Estimates are conservative and confidence-scored. |
| Safe formula engine | Complete | Formula evaluation uses a parser/AST evaluator, accepts `{brand.*}` references, rejects unknown functions, and does not use unsafe runtime eval. |
| Evidence support | Complete | Enriched fields can attach source URL, provider, confidence, capturedAt, and raw excerpts through Evidence rows. |
| Rediem brand workflow | Partial | `analyzeBrandForRediem` detects stack, loyalty, subscriptions, reviews, UGC/social, retail, mission/sustainability, creates evidence, scores, and stores BrandProfile/detections. It is tested with mocked pages; live provider quality depends on configured providers. |
| Rediem buying committee | Partial | Rediem title taxonomy and workflow exist for ecommerce, retention, lifecycle, loyalty, community, CMO, founder, and technical buyers. Live people lookup depends on configured providers. |
| Activation ideas | Complete for stored data | `generateRediemActivationIdeas` creates evidence-backed ideas from BrandProfile, Signals, Evidence, and detections, then stores BrandActivationIdea rows. |
| Rediem UI | Partial | `/rediem/accounts`, account detail, import, playbooks, and formulas pages exist. Buttons currently show queued notices; they do not yet trigger background jobs. |
| Provider integration | Partial | Provider interfaces, registry, mock provider, redaction, caching, and generic MCP boundary exist. Live provider adapters remain a follow-up. |
| Queue/runtime | Partial | Queue abstraction exists, but Redis/BullMQ workers and UI-triggered background execution are not wired. |
| Docs | Partial | README now positions the repo around Rediem-specific GTM intelligence. Deeper docs still include some generic GTM architecture sections and should be tightened next. |

## Implemented

- Rediem-specific data model and seed examples.
- Rediem scoring with explainable component scores and tier classification.
- Rediem formula templates using safe formula syntax and `{brand.*}` references.
- Community Flywheel Ratio scoring, leak detection, recommended plays, and snapshot data models.
- Evidence-backed Rediem brand analysis workflow with mocked tests.
- Rediem buying committee title taxonomy and workflow.
- Evidence-backed activation idea generator.
- Rediem account cockpit and detail UI.
- Mock-first test coverage for scoring, workflows, formulas, evidence, providers, cache, CSV, CRM rules, and observability.

## Partially Implemented

- Live provider adapters for web research, people discovery, contact enrichment, email verification, and structured extraction.
- Workflow execution from Rediem UI actions.
- Background jobs, retry orchestration, and Redis-backed queues.
- Run-level provider result linking for every nested provider call.
- Rediem export mapping for CRM-specific field names.
- Documentation cleanup from generic GTM language to Rediem-first language.

## Broken

- No blocking build, lint, test, or Prisma generate errors are present.
- Database migration status still depends on a local or hosted Postgres instance being available.

## Missing

- Auth, workspace access control, and production multi-tenant safeguards.
- Live Rediem workflow trigger API routes from the UI.
- Production provider implementations and provider-specific live evals.
- CRM-safe Rediem field mapping UI and guarded live CRM sync.
- Screenshots for Rediem cockpit docs.

## Recommended Next Sequence

1. Run `npm run db:migrate` and `npm run db:seed` against a reachable Postgres database.
2. Wire `/rediem/accounts` and detail-page actions to workflow API routes.
3. Add a Redis/BullMQ worker behind the queue abstraction.
4. Thread `workflowRunId` through Rediem workflow provider calls and cache hits.
5. Implement live web research and structured extraction adapters first.
6. Add live people lookup only after brand scoring quality is stable.
7. Tighten docs so Rediem-specific workflows are the default path and generic GTM docs become implementation background.
