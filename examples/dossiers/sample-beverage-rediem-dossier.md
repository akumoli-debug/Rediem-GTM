# Sample Beverage Co. Rediem GTM Account Memo

_Sharp account plan from public and mocked GTM evidence. Scores are prospecting estimates, not customer analytics._

## 1. Account Snapshot

| Field | Value |
| --- | --- |
| Brand | Sample Beverage Co. |
| Domain | sample-beverage.test |
| Category | Beverage / Functional beverage |
| Target customer | Wellness-minded consumers who buy functional drinks in retail and online |
| Commerce stack | Shopify, Recharge, Legacy points app, Okendo |
| Rediem fit | 87/100 (Tier 1) at 64% medium confidence |
| Community archetypes | CULT_CONSUMER_BRAND, RITUAL_REPEAT_USE_BRAND, RETAIL_TO_DTC_BRIDGE_BRAND |
| Public-signal note | Fictional Rediem demo dossier. Public prospecting estimates are confidence-scored and should not be treated as exact customer metrics. |

## 2. Why This Brand Is A Rediem Fit

Rediem fit score: **87/100 (Tier 1) at 64% medium confidence**.

- Reviews are visible via Okendo.
- UGC or creator/community participation is visible.
- Subscription/replenishment exists via Recharge.
- Retail presence creates a retail-to-owned data bridge opportunity.
- Loyalty is present via Legacy points app, creating a migration surface.
- Mission/identity hook: Better-for-you soda alternative with gut health education; Recyclable packaging and lower-sugar positioning

## 3. CFR Summary

| Field | Value |
| --- | --- |
| Estimated CFR | 0.82 |
| Tier | Emerging Community Loop |
| Confidence | 61% medium confidence |
| Earned community growth | 58 |
| Subsidized transactional growth | 71 |
| Primary leak | `POINTS_ONLY_LOYALTY` |
| Recommended CFR play | `VIP_TIER_MIGRATION` |

- Visible reviews, UGC, subscriptions, and retail presence suggest real participation potential.
- The loyalty motion appears points-heavy, so earned community behavior may not be fully captured.
- Retail buyers appear disconnected from owned DTC profiles, making receipt upload a strong first loop.

## 4. Top GTM Diagnostics

| Diagnostic | Score | Confidence | Tier | Read |
| --- | --- | --- | --- | --- |
| UGC Verification Gap (UVG) | 100 | 72% high confidence | Priority | Public UGC energy is estimated at 100; verified member or purchase capture is estimated at 29. Use this as a verification opportunity, not a claim about actual UGC volume. |
| Participation Capture Gap (PCG) | 85 | 72% high confidence | Priority | Visible participation demand is estimated at 100 while owned participation capture is estimated at 73. This is a public-signal estimate, not a measured customer conversion gap. |
| Owned Community Conversion Score (OCCS) | 73 | 72% high confidence | High | Public community demand is estimated at 100 while owned conversion surface is estimated at 73. The score reflects visible conversion readiness, not actual conversion rate. |

## 5. Participation Leaks

- **`POINTS_ONLY_LOYALTY`** (86/100): Rewards language centers on points and VIP tiers, with limited evidence of reviews, referrals, UGC, or zero-party data connected to loyalty. Recommended fix: Audit the points program and migrate high-intent customers into participation-based rewards.
- **`RETAIL_NOT_CONNECTED_TO_DTC`** (78/100): Retail presence is visible, but the sample evidence does not show a receipt upload or retail-to-owned-profile loop. Recommended fix: Launch a receipt upload challenge to turn retail buyers into owned community profiles.

## 6. Recommended Rediem Playbook

**Owned community conversion** (`OWNED_COMMUNITY_CONVERSION`)

Thesis: Public community demand should convert into owned members with repeatable verified participation paths.

Readiness: **OUTBOUND_READY** at 78% high confidence.

- Triggered by Rediem diagnostics: UVG 100/100 at 72% confidence, OCCS 73/100 at 72% confidence, RCBI 67/100 at 72% confidence.
- Required signal matched: Social, reviews, UGC, retail, subscription, referral, or drop demand.
- 2 supporting public signals matched this playbook.

Related Rediem play types: `UGC_SOCIAL_CHALLENGE`, `REVIEW_TO_REFERRAL_CHALLENGE`, `VIP_TIER_MIGRATION`, `RECEIPT_UPLOAD_RETAIL_TO_DTC`, `ZERO_PARTY_PREFERENCE_CHALLENGE`.

## 7. Competitor/Tool Displacement Wedge

This is not a rip-and-replace claim. It is the wedge for where Rediem can become the participation layer across existing tools.

- Legacy points app in loyalty
- Okendo in reviews
- Recharge in subscriptions
- Shopify in ecommerce

## 8. Best Buyer Persona

Start with **Director of Retention**. Most directly owns retention, lifecycle, loyalty, and repeat-purchase loops.

## 9. First Outbound Angle

> Rediem can help convert retail buyers into owned community members through receipt upload, rewards, and follow-on subscription loops.

## 10. 30-Day Activation Idea

**Turn retail buyers into owned community profiles.** Target behavior: Upload a retail receipt, join the community profile, and receive a personalized DTC reward. Why it fits: The brand has retail presence, reviews, UGC, and subscriptions, but no visible retail-to-owned loop.

## 11. CRM/n8n Fields

| CRM field | Value |
| --- | --- |
| `rediem_fit_score` | 87 |
| `rediem_tier` | Tier 1 |
| `community_archetypes` | CULT_CONSUMER_BRAND,RITUAL_REPEAT_USE_BRAND,RETAIL_TO_DTC_BRIDGE_BRAND |
| `community_energy_score` | 91 |
| `participation_capture_gap` | 85 |
| `top_gtm_diagnostic` | UGC Verification Gap |
| `retail_to_community_bridge_index` | 67 |
| `mission_to_action_ratio` | 57 |
| `ugc_verification_gap` | 100 |
| `discount_dependence_ratio` | 10 |
| `zero_party_data_depth` | 26 |
| `product_drop_participation_score` | 66 |
| `stack_fragmentation_index` | 72 |
| `owned_community_conversion_score` | 73 |
| `primary_gtm_diagnosis` | UGC Verification Gap |
| `recommended_gtm_playbook` | UGC_SOCIAL_CHALLENGE |
| `loyalty_maturity_level` | 2 |
| `estimated_cfr` | 0.82 |

| n8n field | Value |
| --- | --- |
| `webhookEvent` | rediem.account_scored |
| `domain` | sample-beverage.test |
| `rediemFitScore` | 87 |
| `rediemTier` | Tier 1 |
| `cfrTier` | Emerging Community Loop |
| `primaryFlywheelLeak` | POINTS_ONLY_LOYALTY |
| `recommendedPlay` | VIP_TIER_MIGRATION |
| `topGtmDiagnostic` | UGC Verification Gap |
| `primaryGtmDiagnosis` | UGC Verification Gap |
| `recommendedGtmPlaybook` | UGC_SOCIAL_CHALLENGE |
| `recommendedFirstContactTitle` | Director of Retention |
| `sequencerEligible` | false |

## 12. Evidence And Source URLs

| ID | Field | Confidence | Source | Excerpt |
| --- | --- | --- | --- | --- |
| ev_rewards_points | loyaltyProgramType | 74% high confidence | [https://sample-beverage.test/rewards](https://sample-beverage.test/rewards) | Earn points and climb VIP tiers with every purchase. |
| ev_reviews | hasReviews | 78% high confidence | [https://sample-beverage.test/reviews](https://sample-beverage.test/reviews) | Customer reviews and product ratings are displayed on the sample review page. |
| ev_store_locator | hasRetailPresence | 71% high confidence | [https://sample-beverage.test/store-locator](https://sample-beverage.test/store-locator) | Find us at Target, Whole Foods, and Sprouts. |
| ev_ugc | hasUGC | 63% medium confidence | [https://sample-beverage.test/community](https://sample-beverage.test/community) | Join our creator community and share your daily ritual. |
| ev_mission | missionDrivenAngle | 66% high confidence | [https://sample-beverage.test/about](https://sample-beverage.test/about) | Better-for-you soda alternative with gut health education and recyclable packaging. |
| ev_drop | productLaunch | 62% medium confidence | [https://sample-beverage.test/blog](https://sample-beverage.test/blog) | New limited seasonal flavor drop with early access for VIP members. |

Source URLs: [https://sample-beverage.test/rewards](https://sample-beverage.test/rewards), [https://sample-beverage.test/reviews](https://sample-beverage.test/reviews), [https://sample-beverage.test/store-locator](https://sample-beverage.test/store-locator), [https://sample-beverage.test/community](https://sample-beverage.test/community), [https://sample-beverage.test/about](https://sample-beverage.test/about), [https://sample-beverage.test/blog](https://sample-beverage.test/blog)

## 13. Confidence And Limitations

- Public prospecting estimates only. Do not treat CFR or diagnostic scores as exact customer metrics.
- No exact revenue, CAC, churn, retention, conversion, sell-through, customer count, or social volume is inferred.
