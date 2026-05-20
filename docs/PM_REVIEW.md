# PM Review — Rediem GTM Intelligence Platform

**Date:** 2026-05-20
**Reviewer:** Claude Code (PM Review Pass)
**Repo:** akumoli-debug/Rediem-GTM
**Branch:** main (up to date)

---

## Executive Summary

This codebase is a purpose-built GTM intelligence system for Rediem's sales motion. It is not a generic CRM enrichment tool — it introduces Rediem-native diagnostic language (CFR, PCG, RCBI, DDR, etc.) that maps directly to specific product plays. The architecture is well-scoped: data flows from signal ingestion → scoring → playbook selection → buyer resolution → export. The quality guardrails are explicit and consistently applied across all docs and likely reflected in scoring logic.

The product thinking is strong. The main open questions are around data sourcing fidelity, adoption friction for AEs/ops teams, and how to maintain signal quality as vendor stacks evolve.

---

## What Works Well

### 1. Clear ICP Thesis with Anti-Patterns
The ICP is defined positively (community-driven brands with fragmented participation) **and** negatively (do not lead with Shopify usage, revenue band, or employee count). This is rare and valuable — it prevents the team from filling pipeline with weak-fit accounts that look good on surface enrichment.

### 2. CFR as a North-Star Narrative Metric
Community Flywheel Ratio is a well-designed metric:
- Dimensioned correctly (earned vs. subsidized growth).
- Has tiers with plain-English meaning.
- Is capped and confidence-scored so it cannot be overclaimed.
- Maps directly to leak types and recommended plays in a consistent vocabulary.

This creates a repeatable sales narrative: "Your CFR is 0.6 because of POINTS_ONLY_LOYALTY. Here's the play."

### 3. Playbook-as-Code Architecture
Ten named playbooks with defined triggers, diagnostic dependencies, readiness gating (`OUTBOUND_READY` vs. `MANUAL_REVIEW`), and evidence contracts. This is operationally mature — GTM ops and AEs get deterministic outputs, not one-off AI summaries.

### 4. Displacement Wedge Discipline
The competitor displacement doc is one of the strongest pieces of product thinking here. Leading with "what not to say" per vendor, then defining the wedge as a participation layer addition rather than a replacement, directly reduces the chance of objection-triggering positioning in outbound.

### 5. Benchmark Report Pipeline
The `generate-rediem-benchmark-report.ts` script + `isSampleData` flag shows awareness of the legal and credibility risks of publishing category benchmarks from thin data. The explicit warnings around sample vs. real data are appropriate for an early-stage company.

### 6. Quality Guardrails Are Consistent
The "do not fabricate" rules appear in every doc (GTM Playbook, CFR, GTM Diagnostic Metrics, Playbook-as-Code). This suggests the product team has internalized the failure mode of AI-assisted prospecting — overclaiming signals that AEs then embarrass themselves with in calls.

---

## Risks and Open Questions

### R1 — Signal Quality Degrades Without a Provider SLA
**Risk:** The scoring stack (`communityFlywheel.ts`, `gtmDiagnostics.ts`, `signals.ts`) depends on public signal ingestion via `mcpResearchProvider.ts` and a waterfall provider pattern. Public signals (detected tools, retail/social language, review program presence) are inherently noisy and go stale quickly. There is no visible refresh cadence or staleness policy at the account level.

**Question:** What is the re-enrichment trigger? Time-based, event-based (funding, replatform), or manual? Without this, a 90-day-old CFR estimate could drive an outbound sequence with outdated positioning.

**Recommendation:** Add a `capturedAt` + `staleAfterDays` policy surfaced in the UI (`RediemAccountDetailView`) and block `OUTBOUND_READY` status on stale signals.

---

### R2 — AE Adoption Friction at the Diagnostic Layer
**Risk:** The diagnostic vocabulary (PCG, RCBI, MAR, UVG, DDR, ZPDD, PDPS, SFI, OCCS) is internally coherent but is nine acronyms for a field team to internalize before the first call. The UI components (`GtmDiagnosticsPanel`, `DisplacementWedgePanel`, `RecommendedPlaybookPanel`) exist, but if AEs open a dossier and see nine scored metrics, most will scroll to "recommended play" and ignore the rest.

**Question:** Which 1-2 diagnostics are most predictive of closed-won, and can the UI surface only those prominently?

**Recommendation:** Run a retrospective on closed/won accounts from the sample dossiers. Identify which diagnostics correlate with conversion. Promote those to primary and collapse the rest into a "diagnostic details" expansion.

---

### R3 — Confidence Score Is Critical but May Not Gate Enough
**Risk:** The confidence scoring model is described in detail but the boundary condition is unclear: what confidence threshold separates `OUTBOUND_READY` from `MANUAL_REVIEW`? If it is too low, AEs will send emails backed by weak signals and erode trust with buyers. If it is too high, the pipeline yield per account drops.

**Question:** Has the threshold been validated against real outbound outcomes, or is it a first-principles estimate?

**Recommendation:** Expose the raw confidence score in the AE-facing view, not just the readiness label. Let AEs see "confidence: 0.51" and make their own call, rather than hiding it behind a binary gate that may not be calibrated yet.

---

### R4 — Benchmark Reports Need a Publication Governance Process
**Risk:** The `BENCHMARK_REPORTS.md` correctly notes that `isSampleData: false` should only be set after data rights review. But there is no process artifact enforcing this — it is a doc convention, not a code control.

**Question:** Who reviews a benchmark report before it goes public? Is there a sign-off workflow?

**Recommendation:** Add a CI check or script flag that requires a human-confirmed `reviewedBy` field before a report is published. This is a one-hour engineering task that prevents a significant credibility or legal risk.

---

### R5 — CRM Sync Rules Are Defined but Integration Reliability Is Unknown
**Risk:** `src/server/crm/` has HubSpot and Salesforce sync with defined field mappings. The quality of CRM writes determines whether the playbook-as-code architecture actually improves pipeline quality, or just generates nice-looking dossiers that don't make it into rep workflows.

**Question:** Are CRM writes atomic and idempotent? What happens when a re-enrichment run changes a playbook recommendation — does it overwrite, append, or flag for review?

**Recommendation:** Define and document the CRM write policy: overwrite vs. append vs. version-snapshotted. Make it explicit in `src/server/crm/syncRules.ts` comments or a companion doc.

---

### R6 — No Visible Feedback Loop from Sales to Scoring
**Risk:** The system produces scores and playbooks, but there is no visible mechanism for AEs to signal "this play was wrong" or "this account converted on a different angle than recommended." Without feedback, the scoring weights cannot improve.

**Question:** Is there a plan for a feedback channel (CRM stage mapping, Slack webhook, thumbs up/down in UI)?

**Recommendation:** Even a lightweight `feedbackTag` field written back to the account record (e.g., `PLAY_CONFIRMED`, `PLAY_OVERRIDDEN`, `ACCOUNT_DISQUALIFIED`) would allow a first retrospective analysis in 90 days.

---

## Feature Gaps to Prioritize

| Gap | Business Impact | Effort |
|-----|----------------|--------|
| Signal staleness policy + outbound gate | High — prevents embarrassing stale outbound | Low-Medium |
| AE-facing confidence visibility | High — builds trust in the tool | Low |
| CRM write idempotency documentation | Medium — ops reliability | Low |
| Feedback loop field (CRM stage or thumbs) | High — enables scoring improvement | Low |
| Benchmark publication governance | Medium — brand/legal risk | Low |
| UI diagnostic prioritization (top 2 metrics) | Medium — AE adoption | Medium |

---

## Technical Architecture Assessment

The server structure is well-organized for a product at this stage:

- `src/server/scoring/` — scoring logic is appropriately separated from workflows.
- `src/server/workflows/` — the waterfall enrichment pattern with `analyzeBrandForRediem` as the primary orchestrator is clean.
- `src/server/playbooks/` — playbook selection is code, not prompt — this is the right call for repeatability.
- `src/server/crm/` — HubSpot and Salesforce side-by-side is fine; watch for field mapping drift as CRM schemas evolve.
- `src/server/observability/` — budget and metrics modules exist, which suggests cost awareness around provider calls (important given research provider costs at scale).
- `src/components/rediem/` — 10 components is a lean, coherent UI surface for an internal GTM tool.

No obvious architectural anti-patterns. The main risk is provider reliability and cost at volume, not structure.

---

## Docs Quality

| Document | Quality | Notes |
|----------|---------|-------|
| `GTM_PLAYBOOK.md` | Strong | Clear ICP, motions, personas, workflow, quality rules. |
| `COMMUNITY_FLYWHEEL_RATIO.md` | Strong | Well-defined metric with tiers, leaks, plays, and confidence rules. |
| `docs/GTM_DIAGNOSTIC_METRICS.md` | Strong | Nine diagnostics with clear definitions and prospecting guardrails. |
| `docs/PLAYBOOK_AS_CODE.md` | Strong | Operating model, safety rules, and example output are all present. |
| `docs/COMPETITOR_DISPLACEMENT_PLAYBOOK.md` | Very strong | Best-in-class vendor wedge table with "what not to say" — directly usable by AEs. |
| `docs/BENCHMARK_REPORTS.md` | Good | Covers structure and risks; governance process is missing. |

---

## Recommended Next Actions (Prioritized)

1. **Add signal staleness gating** to `OUTBOUND_READY` status — block stale accounts from entering sequences automatically.
2. **Expose confidence score numerically** in `RediemAccountDetailView` so AEs can make informed judgment calls.
3. **Define CRM write policy** (overwrite vs. append vs. snapshot) in `syncRules.ts` or a companion doc.
4. **Add a feedback field** to the account schema and CRM field mapping to enable a 90-day scoring retrospective.
5. **Add a benchmark publication checklist** enforced by script (require `reviewedBy` + `isSampleData: false` confirmation).
6. **Identify top 1-2 predictive diagnostics** and elevate them in `GtmDiagnosticsPanel` to reduce AE cognitive load.
