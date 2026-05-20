# CRM Write Policy

Rediem CRM writes must make AE workflow clearer without overwriting human context or turning directional research into hard claims.

## Default Policy

- Default to dry-run and `BLANK_ONLY` writes.
- Append source URLs, evidence summaries, and run timestamps when the CRM field is designed as a log or notes field.
- Overwrite only Rediem-owned fields that were last written by the GTM engine, and only when the incoming value has equal or higher confidence.
- Never overwrite fields that appear manually edited unless a human explicitly enables manual overwrite for a one-time operation.

## Safe Automatic Updates

These fields are safe to update automatically when nonblank and evidence-backed:

- Rediem fit score, CFR, confidence score, and freshness status.
- Primary GTM diagnosis and secondary diagnosis.
- Recommended Rediem playbook and readiness status.
- Evidence/source URL fields.
- Last enriched/analyzed timestamps.
- Dry-run sync status and workflow metadata.

## Human Review Required

Require AE or ops review before writing:

- Low-confidence account recommendations.
- Stale account recommendations.
- Playbook overrides or disqualification notes.
- Claims that imply market share, revenue, churn, CAC, retention, sell-through, or customer counts.
- Any update that would replace manually edited CRM copy, owner notes, lifecycle stage, opportunity stage, account tier, or active sequence membership.

## Re-Enrichment Changes

Re-enrichment can change scores, diagnostics, playbooks, and buyer recommendations. Treat those changes as a new Rediem snapshot:

- If the prior CRM field is blank, write the new value.
- If the prior value is Rediem-owned and lower confidence, overwrite with the higher-confidence value.
- If the prior value conflicts with a human edit, skip and emit a review reason.
- If the recommended playbook changes, preserve the previous play in notes or history and route the account to manual review before outbound.

## Stale Data

The default stale threshold is 30 days from the last analysis timestamp. Stale accounts must not be written as outbound-ready. CRM writes for stale accounts may update freshness status, last analyzed date, and a “needs refresh” task, but playbook, diagnosis, and outbound angle changes require re-analysis first.

## Protecting Manual CRM Edits

The sync layer treats `manuallyEdited` or `updatedBy: CRM_USER` as protected. Protected fields are skipped by default even when Rediem has higher confidence. Use `allowManualOverwrite` only for explicit, audited cleanup runs.

## Append Versus Overwrite

- Append: evidence URLs, analysis notes, prior playbook history, AE feedback, and review reasons.
- Overwrite: Rediem-owned computed fields when blank or when `HIGHER_CONFIDENCE` allows it.
- Never overwrite: human notes, CRM owner fields, lifecycle/opportunity stages, active sequence fields, and any field with manual-edit protection.
