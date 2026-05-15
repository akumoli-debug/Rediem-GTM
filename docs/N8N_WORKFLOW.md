# n8n Workflow

Rediem GTM Intelligence can feed n8n with structured account intelligence for CRM creation, spreadsheet review queues, and sequencer handoff.

The repo does not require n8n for local development. This document describes the recommended workflow contract and payload shape.

## Pseudo-Flow

```text
CSV row
  -> analyze brand
  -> score Rediem fit
  -> if fit score > threshold
  -> resolve buyer committee
  -> generate activation angle
  -> export to CRM/sequencer
```

## Suggested n8n Nodes

1. Webhook Trigger or Manual Trigger
2. Read CSV row or Google Sheets row
3. HTTP Request: run Rediem brand analysis
4. IF: `rediemFitScore >= 70`
5. HTTP Request: resolve Rediem buyer committee
6. HTTP Request: generate activation idea or outbound angle
7. HubSpot: prepare reviewed company create/update payload
8. HubSpot: prepare reviewed contact create/update payload
9. Google Sheets or Airtable: append review row
10. Smartlead or Instantly: create lead only when email is verified

## HTTP Request Input

```json
{
  "workspaceId": "workspace_123",
  "domain": "sample-beverage.test",
  "forceRefresh": false
}
```

## Account Output For n8n

```json
{
  "domain": "sample-beverage.test",
  "brand": "Sample Beverage Co.",
  "rediemFitScore": 87,
  "rediemTier": "Tier 1",
  "communityArchetypes": [
    "CULT_CONSUMER_BRAND",
    "RITUAL_REPEAT_USE_BRAND",
    "RETAIL_TO_DTC_BRIDGE_BRAND"
  ],
  "estimatedCfr": 0.82,
  "cfrTier": "Emerging Community Loop",
  "primaryFlywheelLeak": "POINTS_ONLY_LOYALTY",
  "recommendedPlay": "VIP_TIER_MIGRATION",
  "activationIdea": "Receipt upload challenge",
  "recommendedFirstContactTitle": "Director of Retention",
  "sourceUrls": [
    "https://sample-beverage.test/rewards",
    "https://sample-beverage.test/reviews"
  ]
}
```

## HubSpot Mapping

The repo currently documents CRM-ready export fields and dry-run mappings. Live HubSpot writes are follow-up work and should be enabled only after field mapping review.

Company fields:

- `domain`
- `name`
- `rediem_fit_score`
- `rediem_tier`
- `community_archetypes`
- `community_energy_score`
- `participation_capture_gap`
- `loyalty_maturity_level`
- `estimated_cfr`
- `cfr_tier`
- `primary_flywheel_leak`
- `recommended_rediem_play`
- `rediem_source_urls`

Contact fields:

- `email`
- `firstname`
- `lastname`
- `jobtitle`
- `rediem_persona_group`
- `rediem_role_score`
- `rediem_contactability_score`
- `rediem_email_status`
- `rediem_suggested_angle`

## Smartlead / Instantly Handoff

Only hand off contacts when:

- `emailStatus` is `VERIFIED`
- `contactabilityScore` meets the configured threshold
- Suppression checks pass
- The outbound angle has evidence URLs

Suggested custom variables:

- `brand_name`
- `rediem_tier`
- `community_archetype`
- `primary_flywheel_leak`
- `recommended_play`
- `activation_idea`
- `buyer_angle`
- `source_url_1`
- `source_url_2`

## Google Sheets / Airtable Review Queue

Recommended columns:

- Domain
- Brand
- Category
- Rediem Fit Score
- Rediem Tier
- Community Archetypes
- CFR Tier
- CFR Confidence
- Primary Leak
- Recommended Play
- First Contact
- Buyer Persona
- Suggested Angle
- Source URLs
- Review Status

## Safety Rules

- Use dry-run mode for CRM mutations until mappings are reviewed.
- Never overwrite manually edited CRM fields by default.
- Do not send unverified emails to sequencers.
- Do not include API keys or provider tokens in payloads.
- Route low-confidence accounts to manual review.
