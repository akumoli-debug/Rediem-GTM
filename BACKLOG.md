# Rediem Backlog

## P0 Stabilization

1. Verify migrations against a reachable Postgres database with `npm run db:migrate`.
2. Run `npm run db:seed` and smoke-test `/rediem/accounts`, `/rediem/accounts/[id]`, `/rediem/import`, `/rediem/playbooks`, and `/rediem/formulas`.
3. Review migration history for the Rediem enum/model additions before applying to a shared database.
4. Keep CI running `npm run db:generate`, `npm run lint`, `npm run build`, `npm run test`, and mock evals.

## P1 Rediem Workflow Execution

1. Add API routes to trigger `analyzeBrandForRediem`, `resolveRediemBuyingCommittee`, and `generateRediemActivationIdeas`.
2. Replace Rediem UI queued notices with real workflow run creation and run links.
3. Add bulk Rediem analysis from `/rediem/accounts` with budget controls.
4. Persist structured Rediem workflow events for account detail timelines.
5. Ensure every Rediem workflow failure writes `WorkflowRun.errorMessage`.

## P1 Provider Adapters

1. Implement live web scrape/search/structured extraction adapter for ecommerce brand pages.
2. Add provider normalization tests for Shopify, Shopify Plus, loyalty, reviews, subscription, referral, UGC/social, retail, and mission/sustainability evidence.
3. Add people lookup adapter tuned for Rediem buyer personas.
4. Keep contact enrichment behind verified-only outbound readiness and suppression rules.
5. Gate live provider tests behind explicit live environment flags and budget limits.

## P1 Evidence and Quality

1. Add CFR and loyalty maturity panels to the Rediem account detail UI.
1. Make every BrandProfile field in `analyzeBrandForRediem` show source URL, provider, confidence, and excerpt when available.
2. Add low-confidence handling in the Rediem UI so unsupported claims appear as unknown rather than positive/negative facts.
3. Add Rediem eval fixtures for beauty, beverage, apparel, wellness, food, home, and pet brands.
4. Track hallucination rate for brand category, loyalty provider, platform, and social/UGC claims.

## P2 Rediem UI Completion

1. Add run progress and last-run status to Rediem account rows.
2. Add evidence drawer links from individual fit breakdown fields.
3. Add CRM-ready Rediem export fields: tier, recommended play, activation idea, buyer committee, source URLs.
4. Add saved filter presets for Tier 1, migration opportunity, community gap, and retail-to-DTC.
5. Capture screenshots for the Rediem cockpit and account detail docs.

## P2 CRM and Sales Workflow

1. Create Rediem-specific CRM field mapping defaults.
2. Keep dry-run as the default for all CRM mutations.
3. Add review step before pushing Rediem scores, activation ideas, and evidence URLs to CRM.
4. Add mutation logs with overwrite policy, before/after values, and evidence URLs.

## P3 Documentation

1. Rewrite architecture and workflow docs around Rediem brand intelligence as the primary product.
2. Move generic GTM enrichment concepts into implementation notes only where still relevant.
3. Document the Rediem scoring model, formula templates, and evidence rules with examples.
4. Document provider configuration without naming external projects in product-facing copy.
