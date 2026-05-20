# Playbook As Code

Rediem GTM should behave like a repeatable operating system, not a pile of enrichment fields. The core path is:

```text
signal -> diagnosis -> playbook -> buyer -> outbound angle -> CRM/n8n action
```

Each step preserves evidence, confidence, and safety notes so public prospecting data stays useful without becoming overclaimed.

## Operating Model

1. Collect public signals from the brand site, detected tools, social/community language, retail pages, rewards pages, reviews, subscriptions, launches, and mission content.
2. Score Rediem-native diagnostics such as CFR, PCG, RCBI, UVG, DDR, ZPDD, PDPS, SFI, and OCCS.
3. Select the top 1-3 Rediem playbooks with `selectRediemPlaybooks`.
4. Explain why each playbook was selected and attach evidence IDs and source URLs.
5. Route the playbook to the strongest buyer personas.
6. Export the CRM fields and n8n actions needed for GTM ops review.
7. Gate low-confidence selections into manual review instead of outbound-ready.

## Implementation

Playbook-as-Code lives in:

```text
src/server/playbooks/rediemPlaybooks.ts
```

Primary exports:

- `RediemPlaybookId`
- `RediemPlaybook`
- `RediemPlaybookSelection`
- `selectRediemPlaybooks(input)`

The selector accepts:

- `gtmDiagnostics`
- `communityFlywheelRatio`
- `brandProfile`
- `signals`
- `detections`
- `evidence`

It returns selected playbooks with:

- Score and confidence.
- `OUTBOUND_READY` or `MANUAL_REVIEW` readiness.
- Plain-English reasons for selection.
- Supporting evidence IDs and source URLs.
- Triggered metric IDs.
- Safety notes.

## Rediem Playbooks

| Playbook | Primary Diagnosis | Core Motion |
| --- | --- | --- |
| `RETAIL_TO_OWNED_DATA_BRIDGE` | RCBI, OCCS, PCG | Convert retail buyers into owned members through receipt verification. |
| `POINTS_TO_PARTICIPATION_MIGRATION` | DDR, PCG, SFI | Move points/VIP value into verified participation. |
| `REVIEW_TO_REFERRAL_LOOP` | PCG, OCCS, DDR | Turn verified reviews into referral challenges. |
| `UGC_TO_OWNED_COMMUNITY` | UVG, OCCS, PCG | Convert creator and UGC energy into owned community profiles. |
| `SUBSCRIPTION_RETENTION_LOOP` | DDR, ZPDD, PCG | Reward renewal, streak, preference, review, and referral milestones. |
| `MISSION_CHALLENGE_ACTIVATION` | MAR, ZPDD, PCG | Turn mission narrative into customer actions and rewards. |
| `PRODUCT_DROP_PARTICIPATION` | PDPS, OCCS, PCG | Make drops, launches, and early access moments build community. |
| `ZERO_PARTY_PERSONALIZATION_LOOP` | ZPDD, PCG, MAR | Reward declared preferences and use them to personalize participation. |
| `STACK_FRAGMENTATION_CONSOLIDATION` | SFI, PCG, OCCS | Connect fragmented loyalty, reviews, subscriptions, messaging, and commerce tools. |
| `OWNED_COMMUNITY_CONVERSION` | OCCS, UVG, RCBI | Convert public demand into owned members and repeatable verified actions. |

## Evidence Contract

Every selected playbook must explain itself with evidence. A selection should include:

- The diagnostic metric IDs that triggered it.
- A source URL or evidence ID whenever possible.
- Why the public signal maps to the playbook.
- Buyer personas that naturally own the motion.
- CRM fields and n8n actions GTM ops can use.

If evidence is thin, the playbook can still be useful for research, but readiness should be `MANUAL_REVIEW`.

## Safety Rules

- Do not fabricate revenue, CAC, churn, retention, customer count, conversion, sell-through, waitlist size, or social volume metrics from public data.
- Treat missing public evidence as "not detected," not proof that a program does not exist.
- Do not claim exact internal architecture from public tool detections.
- Do not judge mission authenticity from public copy.
- Use confidence to control readiness: low-confidence selections should not be outbound-ready.
- Keep source URLs with outbound angles so sales can inspect the claim before using it.

## Example Selection

```json
{
  "playbook": {
    "id": "UGC_TO_OWNED_COMMUNITY",
    "title": "UGC-to-owned community"
  },
  "score": 92,
  "confidence": 0.68,
  "readiness": "OUTBOUND_READY",
  "triggeredMetricIds": ["UVG", "OCCS"],
  "whySelected": [
    "Triggered by Rediem diagnostics: UVG 90/100 at 74% confidence.",
    "Required signal matched: UGC, creator, ambassador, TikTok, Instagram, or social community evidence."
  ],
  "sourceUrls": [
    "https://example.test/community"
  ]
}
```

## GTM Ops Usage

For CRM, write the selected playbook ID and top diagnosis into reviewed fields such as:

- `recommended_gtm_playbook`
- `primary_gtm_diagnosis`
- `top_gtm_diagnostic`
- `rediem_source_urls`
- The metric-specific score field, such as `ugc_verification_gap` or `retail_to_community_bridge_index`

For n8n, route by selected playbook:

- Retail bridge plays go to ecommerce or omnichannel owners.
- Points migration and subscription loops go to retention or lifecycle owners.
- UGC and owned community plays go to community, social, or growth owners.
- Mission and product-drop plays go to brand, community, or ecommerce owners.
- Stack consolidation goes to ecommerce, martech, CRM, or digital product owners.
