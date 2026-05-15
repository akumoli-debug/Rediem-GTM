# Legacy Modules

The active product is Rediem GTM Intelligence. A few generic B2B modules remain in the repository because they still compile, have tests, and support earlier scaffolding. They are de-prioritized and should not be extended for Rediem work.

## Archived In Place

| Legacy file | Why it is legacy | Rediem path |
| --- | --- | --- |
| `src/server/workflows/researchAccount.ts` | Generic company research workflow with B2B signals. | `src/server/workflows/analyzeBrandForRediem.ts` |
| `src/server/workflows/outreachAngles.ts` | Generic account/person angle generator. | `src/server/workflows/generateRediemActivationIdeas.ts` and future Rediem-specific outbound angle export. |
| `src/server/workflows/resolveBuyingCommittee.ts` | Generic B2B buying committee resolver. | `src/server/workflows/resolveRediemBuyingCommittee.ts` |
| `src/server/scoring/titleTaxonomy.ts` | Generic B2B persona taxonomy. | `src/server/scoring/rediemTitleTaxonomy.ts` |
| `src/server/playbooks/examples.ts` | Generic playbook examples. | Rediem playbook page and future Rediem playbook definitions. |
| `/accounts`, `/people`, `/signals` pages | Generic workspace scaffolding. | `/rediem/accounts`, `/rediem/accounts/[id]`, `/rediem/import`, `/rediem/playbooks`, `/rediem/formulas`. |
| `/settings/formulas` page | Broad formula engine surface. | Redirects to `/rediem/formulas`, which filters to Rediem-specific formula templates. |
| Generic formula templates | Older account/person templates from the first scaffold. | Rediem templates for fit, CFR, loyalty migration, community gap, recommended play, and AE priority. |

## Package Surface

Generic workflow scripts are no longer exposed in `package.json`. The primary CLI is:

```bash
npm run workflow:rediem-brand -- --domain example.com
```

## Deletion Criteria

Remove legacy modules only after:

1. Rediem UI actions call Rediem workflow API routes.
2. Rediem account detail includes CFR, archetypes, activation ideas, and buyer committee data.
3. No imports or tests depend on the legacy module.
4. A replacement Rediem export or workflow exists for the same operational need.

## Current Recommendation

Keep the legacy files compiling for now, but do not add new generic B2B features. New product work should go through:

- `analyzeBrandForRediem`
- `scoreRediemFit`
- `classifyCommunityArchetype`
- `calculateCommunityFlywheelRatio`
- `resolveRediemBuyingCommittee`
- `generateRediemActivationIdeas`
- Rediem exports for CRM, n8n, spreadsheets, and sequencers
