# Cleanup Plan — Rediem GTM Engine

This document is the authoritative record of what is generic B2B bloat, what has been
archived in place, what should be deleted later, and what Codex should build next.

---

## What Was Cleaned Up (this session)

### 1. Archival headers added to generic modules

These files have been marked with `⚠️ GENERIC B2B MODULE — DO NOT EXTEND FOR REDIEM USE CASES`
headers. They are preserved because they compile and have tests, but no Rediem workflow
should extend or call them.

| File | Why generic | Rediem replacement |
|---|---|---|
| `src/server/workflows/researchAccount.ts` | Scrapes B2B signals (HIRING, COMPLIANCE, PRICING_CHANGE). B2B vocabulary only. | `analyzeBrandForRediem.ts` |
| `src/server/workflows/outreachAngles.ts` | Generates angles for RevOps, enterprise, GTM systems — wrong for DTC AEs. | `generateRediemActivationIdeas.ts` + future `generateRediemOutreachAngles.ts` |
| `src/server/workflows/resolveBuyingCommittee.ts` | Resolves CRO/RevOps/CISO committee with B2B motion scoring. | `resolveRediemBuyingCommittee.ts` |
| `src/server/scoring/titleTaxonomy.ts` | B2B title taxonomy: RevOps, Engineering, Security, Finance. | `rediemTitleTaxonomy.ts` |
| `src/server/playbooks/examples.ts` | Example playbooks for AI GTM, developer infra, VC research. | Rediem motions in `src/app/rediem/playbooks/page.tsx` |

### 2. Formula templates organized

`src/server/formulas/templates.ts` now has section markers:
- **Generic B2B templates** (account-tier → days-since-signal): not shown in the Rediem UI
  because `getRediemFormulaData()` filters them out. Do not add new generic templates.
- **Rediem-specific templates** (rediem-fit-score onward): these are the active product.

### 3. CFR tests written (43 tests, all passing)

`test/communityFlywheel.test.ts` now fully covers the CFR north-star metric including
mode distinction, prospecting caps, leak detection, play recommendations, and `explainCfr`
narrative quality.

---

## What Should Be Deleted Later

Safe to delete once confirmed unused (check `grep -r` for imports first):

### High confidence — delete when ready

| File | Condition for deletion |
|---|---|
| `src/server/workflows/researchAccount.ts` | After `resolveBuyingCommittee.ts` is removed (it imports this) |
| `src/server/workflows/resolveBuyingCommittee.ts` | After confirming no API route or script calls it |
| `src/server/workflows/outreachAngles.ts` | After `generateRediemOutreachAngles.ts` is built |
| `src/server/scoring/titleTaxonomy.ts` | After `resolveBuyingCommittee.ts` is removed |
| `src/server/playbooks/examples.ts` | After replacing with `rediemPlaybookExamples.ts` |
| `test/researchAccount.test.ts` | With `researchAccount.ts` |
| `test/resolveBuyingCommittee.test.ts` | With `resolveBuyingCommittee.ts` |
| `test/outreachAngles.test.ts` | With `outreachAngles.ts` |
| `test/titleTaxonomy.test.ts` | With `titleTaxonomy.ts` |

### Medium confidence — review before deleting

| File | Note |
|---|---|
| `src/server/crm/` (entire directory) | HubSpot/Salesforce sync for B2B CRM. Not used by Rediem workflows. Keep if there's a future CRM export requirement for AE workflows. |
| `src/app/accounts/page.tsx` and `src/app/people/page.tsx` | Generic Clay-style workspace views. The `/rediem` pages are the real product. These may be useful for debugging. |
| `src/app/signals/page.tsx`, `src/app/runs/page.tsx` | Same — generic workspace scaffolding. Low risk to remove once `/rediem` is stable. |
| `src/server/playbooks/` (entire module) | Playbook infrastructure is used by `researchAccount.ts` and `resolveBuyingCommittee.ts`. If both are removed, the playbook module has no callers. The `Playbook` Prisma model can stay for future use. |

---

## Known Schema/Type Inconsistencies

### CFR sub-score rename: TypeScript ≠ DB column names

In `communityFlywheel.ts`, the computed output type was renamed for clarity:

| Old DB column (still in Prisma schema) | New TypeScript field name |
|---|---|
| `verifiedParticipationValue` | `participationDepth` |
| `repeatParticipationRate` | `repeatEngagementStrength` |
| `advocacyConversionRate` | `advocacyPotential` |
| `zeroPartyCompletionRate` | `preferenceCapturePotential` |
| `retentionLiftValue` | `retentionProgramStrength` |
| `rewardCostRatio` | `transactionalRewardBias` |
| `churnRecoveryCost` | `churnExposure` |

**Impact**: Formula templates correctly reference DB column names. When `runCommunityFlywheelAnalysis`
is built to save snapshots, it must map from new TypeScript names to old DB column names,
OR a migration must rename the columns (with a corresponding formula template update).

**Recommended**: Rename the DB columns in a migration when the save workflow is built, then
update the formula templates that reference them (`flywheel-leak-severity`,
`participation-capture-gap`, `discount-dependency-risk`).

### `CommunityFlywheelPlay` has no `snapshotId`

The `CommunityFlywheelPlay` Prisma model cannot be linked to the snapshot that generated it.
This means plays and snapshots cannot be trended together in CS reporting.

**Fix**: Add `snapshotId String?` to `CommunityFlywheelPlay` with a nullable FK to
`CommunityFlywheelSnapshot`. Write the migration when `runCommunityFlywheelAnalysis` is built.

---

## What Codex Should Build Next

Ordered by strategic value:

### 1. `runCommunityFlywheelAnalysis` workflow (highest priority)

CFR is the north-star metric but there is no workflow that computes and persists it.

**Build**: `src/server/workflows/runCommunityFlywheelAnalysis.ts`
- Accepts `{ workspaceId, accountId, mode }` input
- Loads `BrandProfile`, `Signal[]`, `CompetitorToolDetection[]`, `Evidence[]`
- Calls `calculateCommunityFlywheelRatio()`
- Saves to `CommunityFlywheelSnapshot`, `CommunityFlywheelLeak[]`, `CommunityFlywheelPlay[]`
- Maps TypeScript field names to current DB column names (see table above)
- Client type must be injectable (follows pattern of other Rediem workflows)

**Also**: Wire it into `getRediemAccountDetailData()` in `src/server/rediem/uiData.ts` so
the CFR tier and explanation appear in the account detail view.

### 2. `generateRediemOutreachAngles` workflow

Replace `outreachAngles.ts` with a DTC-specific AE angle generator.

**Build**: `src/server/workflows/generateRediemOutreachAngles.ts`
- Pulls from `BrandProfile`, `CommunityFlywheelSnapshot`, `BrandActivationIdea`, `Signal[]`
- Generates 2–3 outbound angles in DTC vocabulary: loyalty migration, subscription loop,
  receipt upload, community activation, CFR diagnostic
- Each angle includes: `whyNow`, `painHypothesis`, `suggestedOneLiner`, `relevantEvidence[]`
- Confidence-gated: returns `INSUFFICIENT_EVIDENCE` if profile is too sparse
- `whyItFitsThisBrand` should name provider names and CFR tier (same standard as activation ideas)

### 3. CFR snapshot display in account detail view

`RediemAccountDetailView.tsx` currently shows fitBreakdown, detections, signals, activation
ideas, and buyer committee — but NOT the CFR snapshot.

**Build**: Add a "Community Flywheel" section to the account detail view that shows:
- CFR tier badge (Transactional Trap / Emerging / Healthy / Iconic)
- `explanation[]` lines from `explainCfr()`
- Top 3 leaks with severity and recommended fix
- Top recommended play
- Confidence percentage and mode (prospecting vs customer)

### 4. Rediem formula templates for CFR (pending DB rename)

Once DB columns are renamed to match TypeScript:
- Update `flywheel-leak-severity` to use `transactionalRewardBias` and `churnExposure`
- Update `participation-capture-gap` to use `participationDepth`
- Add `cfr-confidence` template: flags low-confidence snapshots for AE review
- Add `cfr-prospecting-vs-customer` template: distinguishes estimated from actual CFR

### 5. `rediemPlaybookExamples.ts`

Replace `playbooks/examples.ts` with DTC-specific playbook definitions:
- Loyalty Migration playbook: `analyzeBrandForRediem` → `resolveRediemBuyingCommittee` → `generateRediemActivationIdeas`
- Community Activation playbook: same but prioritizes UGC/social signals
- Retail-to-DTC Bridge: flags `hasRetailPresence` + `shopifyDetected` → receipt upload idea
- CFR Diagnostic playbook: `runCommunityFlywheelAnalysis` → export snapshot + explanation

### 6. DB column rename migration for CFR sub-scores

Write `prisma/migrations/YYYYMMDD_rename_cfr_sub_scores/migration.sql` that renames:
- `verifiedParticipationValue` → `participationDepth`
- `repeatParticipationRate` → `repeatEngagementStrength`
- `advocacyConversionRate` → `advocacyPotential`
- `zeroPartyCompletionRate` → `preferenceCapturePotential`
- `retentionLiftValue` → `retentionProgramStrength`
- `rewardCostRatio` → `transactionalRewardBias`
- `churnRecoveryCost` → `churnExposure`

Update Prisma schema and formula templates in the same PR.

---

## Rediem-Specific Workflow Map (what to use)

```
Brand analysis:       analyzeBrandForRediem.ts
Scoring:              src/server/scoring/rediem.ts (scoreRediemFit, classifyRediemTier)
Community Flywheel:   src/server/scoring/communityFlywheel.ts (calculateCommunityFlywheelRatio)
CFR persistence:      ← MISSING: runCommunityFlywheelAnalysis.ts (build next)
Buying committee:     resolveRediemBuyingCommittee.ts + rediemTitleTaxonomy.ts
Activation ideas:     generateRediemActivationIdeas.ts
Outreach angles:      ← MISSING: generateRediemOutreachAngles.ts (build next)
UI data:              src/server/rediem/uiData.ts
Formula context:      src/server/formulas/service.ts (already integrates BrandProfile + CFR)
Formula templates:    src/server/formulas/templates.ts (Rediem section)
```

---

## Build/Test Status

All tests pass as of this cleanup:

```
test/communityFlywheel.test.ts        43 tests  PASS
test/rediemActivationIdeas.test.ts     9 tests  PASS
test/rediemTitleTaxonomy.test.ts      ~8 tests  PASS
test/resolveRediemBuyingCommittee.test.ts ~10 tests  PASS
test/rediemScoring.test.ts            ~6 tests  PASS
test/rediemBrandWorkflow.test.ts      ~4 tests  PASS
```

Generic module tests still pass (not modified):
```
test/researchAccount.test.ts          PASS
test/resolveBuyingCommittee.test.ts   PASS
test/outreachAngles.test.ts           PASS
test/titleTaxonomy.test.ts            PASS
```
