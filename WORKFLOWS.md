# Workflows

GTM Engine workflows are provider-neutral TypeScript functions under `src/server/workflows`. They accept narrow client interfaces, which makes them testable with in-memory stores and usable with Prisma in the app.

## Account Research

`researchAccount(client, providers, input)`

Input:

```ts
{
  workspaceId: string;
  domain: string;
  focus?: string;
  playbookId?: string;
  maxCostUsd?: number;
  forceRefresh?: boolean;
}
```

What it does:

1. Canonicalizes the domain.
2. Checks cached account research unless `forceRefresh` is true.
3. Calls `CompanyProvider.enrichCompany`.
4. Scrapes and extracts root, about, pricing, careers, blog, and press pages.
5. Searches recent web/news events.
6. Stores Account fields with Evidence.
7. Creates Signals with scored relevance, freshness, and source quality.
8. Computes `accountScore`.
9. Re-evaluates account formulas.
10. Caches and returns a compact dossier.

Run from CLI:

```bash
npm run workflow:research-account -- --domain linear.app
npm run workflow:research-account -- --domain linear.app --focus "AI GTM workflow software"
npm run workflow:research-account -- --domain linear.app --playbook-id <playbook_id>
```

CLI workflow runs are wrapped in `WorkflowRun` tracking so completed and failed runs are visible in run history.

## Buying Committee Resolution

`resolveBuyingCommittee(client, providers, input)`

Input:

```ts
{
  workspaceId: string;
  accountId?: string;
  domain?: string;
  motion: string;
  playbookId?: string;
  maxPeople?: number;
  forceRefresh?: boolean;
}
```

What it does:

1. Loads an account or researches it if needed.
2. Derives role hints from motion and playbook target personas.
3. Calls `PeopleProvider.findPeople`.
4. Normalizes titles into seniority, department, and persona type.
5. Scores people for role fit, seniority, department, recent signals, account context, contactability, and source confidence.
6. Stores Person rows and Evidence.
7. Re-evaluates person formulas.
8. Returns grouped buying committee lists.

Run from CLI:

```bash
npm run workflow:buying-committee -- --domain example.com --motion "AI GTM workflow software"
npm run workflow:buying-committee -- --domain example.com --motion "developer infrastructure" --max-people 10
```

## Contact Enrichment

`enrichContacts(client, providers, input)`

Input:

```ts
{
  workspaceId: string;
  personIds?: string[];
  accountId?: string;
  maxCostUsd?: number;
  requireVerifiedEmail?: boolean;
  forceRefresh?: boolean;
}
```

Waterfall:

1. Skip people with a verified email checked within the last 30 days.
2. Verify existing email if present.
3. Try configured contact providers in order.
4. Generate likely email patterns when providers do not return an email.
5. Verify candidates.
6. Store best email, email status, contactability score, and evidence.
7. Mark sequence-ready only when status is `VERIFIED`.

Suppressed role-based addresses include:

- `info@`
- `support@`
- `sales@`
- `careers@`
- `admin@`
- `hello@`

## Outreach Angles

`generateOutreachAngles(client, input)`

Input:

```ts
{
  workspaceId: string;
  accountId: string;
  personId?: string;
  motion: string;
}
```

The generator creates three evidence-backed drafting angles:

- Conservative/direct
- Signal-based
- Creative/personable

It requires Account/Person context, Signal rows, Evidence rows, and source URLs. If evidence is weak, it returns `INSUFFICIENT_EVIDENCE` instead of unsupported copy.

Generated angles are stored as Evidence rows. The workflow does not send emails.

## Waterfall Engine

`runWaterfall` supports:

- Ordered steps
- Run conditions
- Stop conditions
- Max cost
- Max attempts
- Cache hits
- Provider health checks
- Retry with backoff
- Structured logs
- ProviderResult persistence

Use it for multi-provider enrichment flows where the next step depends on confidence, cost, or previous output.

## Playbooks

Saved playbooks define:

- Target motion
- Target personas
- Account fit rules
- Signal types
- Formula columns
- Workflow steps
- Export fields
- Budget defaults

Seeded examples:

- AI GTM Workflow Sale
- Developer Infrastructure Sale
- VC Founder Research

Workflows can accept `playbookId` to use playbook motion and role-hint defaults.
