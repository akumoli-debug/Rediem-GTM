# Rediem GTM Intelligence

Rediem GTM Intelligence helps prioritize community-driven consumer brands with high participation potential and an uncaptured community flywheel. The focus is not primarily Shopify, revenue, or company size; those are useful filters, while the core thesis is whether customers already identify with, advocate for, review, subscribe to, share, or culturally participate in the brand.

It is built for community-driven loyalty, referrals, reviews, social challenges, subscriptions, receipt rewards, zero-party data, and AI discoverability.

The workspace imports brand accounts, analyzes commerce and loyalty readiness, preserves evidence for every claim, estimates Community Flywheel Ratio, scores Rediem fit, generates activation ideas, resolves Rediem-specific buyer committees, and exports CRM-ready account context.

Community Flywheel Ratio, or CFR, estimates how much growth a brand can create from verified customer participation compared with growth it has to buy through discounts, points, paid acquisition, and one-off incentives.

## Core Features

- Rediem brand profile model for ecommerce platform, loyalty, subscriptions, reviews, UGC/social, retail, sustainability, mission, migration pain, and agentic commerce signals.
- Community archetype classification for cult consumer, mission-led, ritual repeat-use, retail-to-DTC bridge, creator/ambassador-led, product drop, education/trust-led, and low-community commodity brands.
- Evidence-backed brand analysis with source URL, provider, confidence, capturedAt, and raw excerpts where available.
- Community Flywheel Ratio snapshots, leak detection, and recommended CFR plays.
- Loyalty maturity levels from no program through behavioral and agentic loyalty.
- Explainable Rediem scoring weighted toward community energy, participation capture gap, repeat-purchase ritual fit, retail-to-owned-data opportunity, mission identity strength, stack migration opportunity, and timing signals.
- Rediem activation idea generation for review rewards, referrals, subscription retention, UGC challenges, receipt rewards, product drops, mission challenges, VIP migration, retail-to-DTC, and zero-party preference collection.
- Rediem buyer committee resolution for ecommerce, retention, lifecycle, loyalty, community, CRM, CMO, founder, and technical integration buyers.
- Safe formula columns with Rediem templates and `{brand.*}` references. Formula evaluation uses a parser/AST evaluator, not JavaScript execution.
- Rediem cockpit pages for accounts, account detail, import, playbooks, and formulas.
- Mock-first provider, workflow, scoring, evidence, formula, cache, CRM rule, and eval tests.

## Quickstart

```bash
npm install
cp .env.example .env
npm run db:generate
npm run dev
```

Open `http://localhost:3000/rediem/accounts`.

For database-backed pages and seed data, set `DATABASE_URL`, then run:

```bash
npm run db:migrate
npm run db:seed
```

## Environment Variables

Copy `.env.example` to `.env` and fill what you need:

```bash
DATABASE_URL=
REDIS_URL=
MCP_RESEARCH_SERVER_COMMAND=
MCP_RESEARCH_SERVER_ARGS=
MCP_RESEARCH_MOCK_RESPONSES=true
APIFY_TOKEN=
FIRECRAWL_API_KEY=
BROWSERBASE_API_KEY=
BROWSERBASE_PROJECT_ID=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
HUBSPOT_ACCESS_TOKEN=
SALESFORCE_CLIENT_ID=
SALESFORCE_CLIENT_SECRET=
SALESFORCE_REFRESH_TOKEN=
```

Local tests use mock providers by default. Configure external providers only when you are ready to run live research.

## Running Locally

```bash
npm run dev
npm run build
npm run lint
npm run test
npm run eval
```

Database commands:

```bash
npm run db:generate
npm run db:migrate
npm run db:studio
npm run db:seed
```

## Importing Brands

Use `/rediem/import` or start from `examples/accounts.csv`.

Required column:

- `domain` or `company website`

Optional columns:

- `companyName`
- `linkedinUrl`
- `industry`
- `notes`

The importer validates domains, dedupes by workspace and domain, and previews rows before import.

## Running Rediem Workflows

Analyze a brand for Rediem fit:

```bash
npm run workflow:rediem-brand -- --domain example.com
```

Generic account research and buying committee scripts still exist as implementation utilities, but the Rediem cockpit should use Rediem-specific workflows first.

## Rediem Formula Templates

Installed templates include:

- Rediem Tier
- Points Loyalty Migration
- Community Gap
- Review Activation Fit
- Subscription Retention Fit
- Retail-to-DTC Fit
- Agentic Commerce Angle
- AE Priority

Example:

```text
IF(AND({brand.rediemFitScore} >= 80, {brand.migrationPainScore} >= 60), "Work now", IF({brand.rediemFitScore} >= 65, "Nurture", "Skip"))
```

Use `/rediem/formulas` to review and install Rediem templates.

## Evidence Rules

- Do not fabricate invisible or unknown fields.
- Store source URL, provider, confidence, capturedAt, and raw excerpt whenever available.
- Low-confidence claims should remain low confidence in scoring and UI.
- Outbound angles and activation ideas should be tied to stored evidence or signals.

## Documentation

- `STATUS.md`
- `BACKLOG.md`
- `ARCHITECTURE.md`
- `DEVELOPMENT.md`
- `WORKFLOWS.md`
- `FORMULAS.md`
- `PROVIDERS.md`
- `CRM_SYNC.md`
- `EVALS.md`
- `SECURITY.md`

No substantial third-party source code is copied into this repository. A third-party notices file is not needed unless future changes vendor external source code.
