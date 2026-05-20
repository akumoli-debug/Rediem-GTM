# Benchmark Reports

Rediem benchmark reports turn account-level CFR and GTM diagnostics into category-level thought leadership. They are designed for public-facing narratives such as "where participation is leaking in wellness brands" or "why beverage brands need a retail-to-owned community bridge."

## Demo Report

Generate the sample benchmark report:

```bash
npx tsx scripts/generate-rediem-benchmark-report.ts \
  --input examples/benchmarks/sample-brands-benchmark.json \
  --output examples/reports/community-flywheel-benchmark-2026.md
```

The bundled sample report is written to:

```text
examples/reports/community-flywheel-benchmark-2026.md
```

## Sample Versus Real Data

The default report mode is sample/demo. In this mode, the report must say:

- The benchmark is generated from sample brand records.
- The title and dataset mode visibly say `SAMPLE / DEMO`.
- The category reads are publishing examples, not real market statistics.
- CFR and diagnostics are estimates unless backed by first-party or permissioned data.

Only set `isSampleData` to `false` when the input contains a real, permissioned dataset and the team has reviewed collection scope, sample size, data rights, and publication language. The generator now enforces this: real reports must set `sourceDataMode` to `provided` or `permissioned` and include `reviewedBy`.

If those fields are missing, generation fails instead of creating a real-sounding market report from ambiguous data.

## Input Shape

The generator expects JSON with:

- `title`
- `reportDate`
- `isSampleData`
- `sourceDataMode` (`sample`, `demo`, `provided`, or `permissioned`)
- `reviewedBy` for real/provided reports
- `reviewedAt`
- `methodologyNote`
- `brands`

Each brand can include:

- `brandName`
- `domain`
- `category`
- `estimatedCfr`
- `cfrConfidence`
- `cfrTier`
- `gtmDiagnostics`
- `participationLeaks`
- `stackTools`
- `recommendedPlaybooks`
- `outboundAngle`
- `sourceUrls`

## Report Sections

The generated markdown includes:

- Median CFR by category.
- Highest Participation Capture Gap categories.
- Strongest Retail-to-Community Bridge opportunities.
- Most common participation leaks.
- Most common stack fragmentation patterns.
- Top Rediem playbooks by category.
- Sample outbound angles by category.
- Confidence and data limitations.

## Publishing Guidance

Use benchmark reports to show how CFR can become a category asset:

- Lead with the category tension: participation exists, but it is not owned, verified, or connected.
- Use medians and counts only within the dataset being reported.
- Translate every diagnostic into a Rediem playbook.
- Keep vendor and stack language non-combative.
- Avoid exact market claims unless the dataset truly supports them.
- Never infer revenue, CAC, churn, retention, customer count, social volume, review volume, or sell-through from public sample data.

## Governance Checklist

Before external publication of a non-sample benchmark:

- Confirm `isSampleData: false`.
- Confirm `sourceDataMode` is `provided` or `permissioned`.
- Add a named `reviewedBy` owner.
- Document data provenance, sample size, collection dates, and permission scope in `methodologyNote`.
- Remove or soften any real-sounding market claim that is not directly supported by the dataset.
- Keep low-confidence rows framed as directional, not definitive.
