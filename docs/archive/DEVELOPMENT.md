# Development

This guide covers local setup, scripts, database work, tests, and contribution expectations for GTM Engine.

## Requirements

- Node.js 22 or newer
- npm
- Postgres for database-backed local development

Redis is represented in configuration for future queue/cache adapters, but the current local workflow path does not require Redis.

## Setup

```bash
npm install
cp .env.example .env
npm run db:generate
```

Set `DATABASE_URL` in `.env` before running migrations:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/gtm_engine?schema=public
```

Then run:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run test
npm run eval
npm run db:generate
npm run db:migrate
npm run db:studio
npm run db:seed
npm run workflow:research-account -- --domain linear.app
npm run workflow:buying-committee -- --domain example.com --motion "AI GTM workflow software"
npm run crm:dry-run
```

## Database Changes

Update `prisma/schema.prisma`, then create a migration:

```bash
npm run db:migrate
```

Regenerate the Prisma client after schema changes:

```bash
npm run db:generate
```

Seed data lives in `prisma/seed.ts` and includes sample accounts, people, signals, evidence, formulas, playbooks, and formula templates.

## Testing

Unit and workflow tests run with Node's test runner and `tsx`:

```bash
npm run test
```

The suite uses mock providers and in-memory clients where possible so it does not need live provider credentials.

## Evals

Mock evals are safe by default:

```bash
npm run eval
```

Live research evals are opt-in:

```bash
EVAL_LIVE=true npm run eval
```

Live mode requires configured external provider credentials or MCP command settings.

## CI

`.github/workflows/ci.yml` runs:

- `npm ci`
- `npm run lint`
- `npm run test`
- `npm run eval`
- `npm run build`

Mock evals run in CI. Live evals are intentionally not run in CI.

## Coding Guidelines

- Keep public product copy generic and provider-neutral.
- Preserve evidence for claims that affect scoring, exports, or outreach.
- Prefer provider adapters over coupling workflows to one external system.
- Do not use unsafe formula execution.
- Add focused tests when touching workflow logic, formula behavior, provider adapters, or sync rules.
- Do not log secrets, tokens, raw credentials, or private customer payloads.
