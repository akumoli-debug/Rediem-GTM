# n8n Workflow

Rediem GTM Intelligence can feed n8n with structured account intelligence for CRM creation, spreadsheet review queues, and sequencer handoff.

The repo does not require n8n for local development. This document describes the recommended workflow contract and payload shape.

## Pseudo-Flow

```text
CSV row
  -> analyze brand
  -> score Rediem fit
  -> calculate CFR and GTM diagnostic metrics
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
  "topGtmDiagnostic": "UGC Verification Gap",
  "primaryGtmDiagnosis": "UGC Verification Gap",
  "recommendedGtmPlaybook": "UGC_SOCIAL_CHALLENGE",
  "primary_displacement_wedge": "Keep the loyalty investment intact while Rediem expands what can be verified, rewarded, and routed back into the customer profile.",
  "detected_current_stack": "LoyaltyLion (loyalty), Okendo (reviews), Recharge (subscriptions), Klaviyo (email_sms), Shopify (ecommerce)",
  "what_not_to_say": "Do not say 'replace your loyalty platform.'",
  "rediem_wedge": "Move from points and referrals into broader verified participation across reviews, referrals, UGC, preferences, events, and retail proof.",
  "gtmDiagnostics": [
    {
      "metricId": "UVG",
      "label": "UGC Verification Gap",
      "score": 100,
      "confidence": 0.72,
      "tier": "Priority"
    },
    {
      "metricId": "PCG",
      "label": "Participation Capture Gap",
      "score": 85,
      "confidence": 0.72,
      "tier": "Priority"
    }
  ],
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
- `top_gtm_diagnostic`
- `retail_to_community_bridge_index`
- `mission_to_action_ratio`
- `ugc_verification_gap`
- `discount_dependence_ratio`
- `zero_party_data_depth`
- `product_drop_participation_score`
- `stack_fragmentation_index`
- `owned_community_conversion_score`
- `primary_gtm_diagnosis`
- `recommended_gtm_playbook`
- `primary_displacement_wedge`
- `detected_current_stack`
- `what_not_to_say`
- `rediem_wedge`
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
- `top_gtm_diagnostic`
- `primary_gtm_diagnosis`
- `recommended_gtm_playbook`
- `primary_displacement_wedge`
- `detected_current_stack`
- `what_not_to_say`
- `rediem_wedge`
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
- Top GTM Diagnostic
- Primary GTM Diagnosis
- Recommended GTM Playbook
- Primary Displacement Wedge
- Detected Current Stack
- What Not To Say
- Rediem Wedge
- PCG
- RCBI
- MAR
- UVG
- DDR
- ZPDD
- PDPS
- SFI
- OCCS
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
