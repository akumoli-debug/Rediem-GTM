# Demo

This demo shows the Rediem-specific GTM flow from a brand domain to a CRM/n8n-ready account dossier.

The demo uses sample data and mocked providers unless live provider keys are configured. It should not be interpreted as real customer metrics.

<!-- Screenshot placeholder:
![Rediem cockpit](assets/rediem-cockpit.png)
Place the screenshot at docs/assets/rediem-cockpit.png, then remove this comment.
-->

## What The Demo Shows

- Brand profile extraction for a community-driven consumer brand.
- Community archetype classification.
- Rediem Fit Score and component scores.
- Community Flywheel Ratio estimate with confidence.
- GTM diagnostic metrics for participation capture, retail-to-community bridge, mission-to-action, UGC verification, discount dependence, zero-party data depth, product drops, stack fragmentation, and owned community conversion.
- Primary flywheel leak and recommended Rediem play.
- Activation ideas tied to visible evidence.
- Rediem buyer committee and recommended first contact.
- Outbound angle examples.
- n8n and CRM export payload shape.

## Sample Input

Use a fictional or internal test domain:

```bash
npm run workflow:rediem-brand -- --domain sample-beverage.test
npm run workflow:rediem-brand -- --domain sample-beverage.test --output examples/sample-run-output.json
```

The saved sample output is:

```text
examples/sample-rediem-dossier.json
```

## Expected Output Structure

```json
{
  "brandProfile": {},
  "communityArchetypes": [],
  "rediemScores": {},
  "communityFlywheelRatio": {},
  "gtmDiagnostics": [],
  "topDiagnostics": [],
  "primaryGtmDiagnosis": {},
  "recommendedPlayTypes": [],
  "flywheelLeaks": [],
  "activationIdeas": [],
  "buyerCommittee": {},
  "recommendedFirstContact": {},
  "outboundAngles": [],
  "n8nExport": {},
  "crmFields": {},
  "evidence": []
}
```

## Example Demo Values

Example Rediem Fit Score:

```text
87 / 100
```

Example CFR estimate:

```text
0.82, Emerging Community Loop, 0.61 confidence
```

Example top GTM diagnostics:

```text
UGC Verification Gap, Participation Capture Gap, Owned Community Conversion Score
```

Example primary flywheel leak:

```text
POINTS_ONLY_LOYALTY
```

Example activation idea:

```text
Receipt upload challenge: reward retail buyers for uploading receipts, then invite them into DTC subscriptions and review/referral loops.
```

Example buyer angle:

```text
Your retail and review activity shows customers are already participating, but the loop is not fully owned. Rediem can turn those signals into verified participation, retention, and referral plays.
```

## Example n8n / CRM Export

```json
{
  "domain": "sample-beverage.test",
  "rediemFitScore": 87,
  "rediemTier": "Tier 1",
  "cfrTier": "Emerging Community Loop",
  "primaryFlywheelLeak": "POINTS_ONLY_LOYALTY",
  "recommendedPlay": "VIP_TIER_MIGRATION",
  "topGtmDiagnostic": "UGC Verification Gap",
  "primaryGtmDiagnosis": "UGC Verification Gap",
  "recommendedGtmPlaybook": "UGC_SOCIAL_CHALLENGE",
  "recommendedFirstContactTitle": "Director of Retention",
  "sourceUrls": [
    "https://sample-beverage.test/rewards",
    "https://sample-beverage.test/reviews"
  ]
}
```

## Demo Talk Track

1. Import brand domain.
2. Run Rediem brand analysis.
3. Review fit score, archetypes, CFR tier, and evidence.
4. Show top GTM diagnostics and the primary GTM diagnosis.
5. Show the primary flywheel leak and recommended play.
6. Show activation ideas and buyer committee.
7. Show the n8n/CRM payload that can power HubSpot, spreadsheets, or sequencer review.

## Known Demo Limits

- Live provider quality depends on configured adapters and keys.
- CFR is an estimate during prospecting.
- GTM diagnostics are public-signal estimates with confidence, not exact customer metrics.
- Contact enrichment and sequencer handoff should remain verified-email-only.
- UI-triggered background jobs are still roadmap work.
