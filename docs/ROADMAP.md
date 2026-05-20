# Roadmap

This roadmap is intentionally honest. The repo is demo-ready for Rediem-specific GTM intelligence flows with mocked providers, but not yet a fully productionized outbound system.

## Now

- Rediem brand analysis.
- Rediem Fit Score.
- Community archetype scoring.
- Loyalty/community gap diagnosis.
- Community Flywheel Ratio framing, scoring, leak detection, and recommended plays.
- Rediem activation idea generation.
- Rediem buyer committee resolution.
- Evidence preservation for enriched claims.
- CSV import/export primitives.
- CRM-safe dry-run abstractions.
- n8n/CRM/sequencer export shape documentation.
- Mock-first tests for core scoring and workflows.

## Next

- Live API provider adapters for brand research, people discovery, contact enrichment, and email verification.
- Brand discovery queue and bulk Rediem account analysis.
- HubSpot field sync with safe overwrite policies.
- n8n webhook templates and sample workflow JSON.
- CFR and community archetype UI panels on Rediem account detail pages.
- Implement GTM diagnostic metrics beyond CFR: PCG, RCBI, MAR, UVG, DDR, ZPDD, PDPS, SFI, and OCCS with confidence, evidence IDs, source URLs, recommended plays, and low-confidence handling.
- Competitor displacement enrichment for loyalty, reviews, subscription, SMS/email, and referral tools.
- npm audit cleanup.
- Production auth and workspace access control.
- Provider budget dashboards for live usage.

## Prioritized Backlog

1. Run `npm run db:migrate` and `npm run db:seed` against a reachable Postgres database.
2. Wire `/rediem/accounts` and detail-page actions to workflow API routes.
3. Add a Redis/BullMQ worker behind the queue abstraction.
4. Thread `workflowRunId` through Rediem workflow provider calls and cache hits.
5. Implement live web research and structured extraction adapters first.
6. Add live people lookup only after brand scoring quality is stable.
7. Add CFR and community archetype panels to the Rediem account detail UI.
8. Implement the GTM diagnostic metric service and export fields for PCG, RCBI, MAR, UVG, DDR, ZPDD, PDPS, SFI, and OCCS.
9. Add CRM field mapping defaults for Rediem fit, CFR, diagnostic metrics, recommended play, buyer committee, and source URLs.
10. Add low-confidence handling in the Rediem UI so unsupported claims appear as unknown rather than positive/negative facts.
11. Add Rediem eval fixtures for beauty, beverage, apparel, wellness, food, home, and pet brands.

## Later

- Account discovery from category keywords, retailer lists, social signals, and review marketplaces.
- Rediem-specific outbound angle generator with approval workflow.
- Customer-mode CFR ingestion from first-party customer data.
- Rediem playbook automation for loyalty migration, community activation, retail-to-DTC bridge, and CFR diagnostic motions.
- Live CRM writeback with mutation review.

## Non-Goals For This Phase

- Generic B2B enrichment expansion.
- Fully automated cold outbound without human review.
- Fabricated revenue, customer count, CAC, churn, retention, or social metrics.
- Provider-specific claims without implemented adapters and tests.
