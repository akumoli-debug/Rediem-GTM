# Community Flywheel Ratio

Community Flywheel Ratio, or CFR, is the north-star metric Rediem can report back to customers.

```text
CFR = Earned Community Growth / Subsidized Transactional Growth
```

## Plain English

CFR estimates how much growth a brand creates from verified customer participation compared with how much growth it has to buy through discounts, points, paid acquisition, and one-off incentives.

During GTM prospecting, CFR is an evidence-backed estimate. It should never imply exact customer metrics unless those metrics are provided by the customer or a trusted system of record.

## Earned Community Growth

Estimated from:

- Participation depth (how many verified community behaviors the brand supports)
- Repeat engagement strength (how likely customers are to engage more than once)
- Advocacy potential (signals of organic advocacy via referrals, UGC, and reviews)
- Preference capture potential (signals of preference and intent collection)
- Retention program strength (strength of the retention infrastructure)

Examples of evidence:

- Reviews and review programs
- Referrals and ambassador programs
- UGC or social challenge language
- Subscription renewal and replenishment behavior
- Preference quizzes, profiles, surveys, and zero-party data flows
- Mission or education content that customers can participate in

## Subsidized Transactional Growth

Estimated from:

- Discount dependency (how discount-heavy the retention language appears)
- Transactional reward bias (how transactional vs behavioral the reward structure is)
- Paid CAC dependency (signals of heavy paid acquisition reliance)
- Churn exposure (risk signals from churn-recovery language and lack of loyalty infrastructure)

Examples of evidence:

- Discount-heavy language
- Points-only loyalty programs
- One-off coupon or first-purchase incentive pressure
- Paid acquisition language
- Retention language that lacks participation loops
- Reviews, referrals, subscriptions, and retail activity that are disconnected from owned loyalty

## Tiers

| CFR | Tier | Meaning |
| --- | --- | --- |
| `< 0.5` | Transactional Trap | Growth appears dependent on discounts, paid acquisition, points, or one-off incentives. |
| `0.5 to < 1.0` | Emerging Community Loop | Participation exists, but the loop is incomplete or fragmented. |
| `1.0 to < 2.0` | Healthy Community Flywheel | Participation is starting to outperform subsidized growth. |
| `>= 2.0` | Iconic Brand Flywheel | Community participation appears to be a major growth asset. |

## Leak Types

- `NO_PARTICIPATION_CAPTURE`
- `POINTS_ONLY_LOYALTY`
- `DISCOUNT_HEAVY_RETENTION`
- `REVIEWS_ISOLATED_FROM_REWARDS`
- `UGC_NOT_VERIFIED`
- `WEAK_REFERRAL_LOOP`
- `NO_SUBSCRIPTION_REWARD_SERIES`
- `NO_ZERO_PARTY_DATA_LOOP`
- `RETAIL_NOT_CONNECTED_TO_DTC`
- `SOCIAL_COMMUNITY_NOT_OWNED`

## Recommended Plays

- `REVIEW_TO_REFERRAL_CHALLENGE`
- `SUBSCRIPTION_REWARD_SERIES`
- `UGC_SOCIAL_CHALLENGE`
- `RECEIPT_UPLOAD_RETAIL_TO_DTC`
- `ZERO_PARTY_PREFERENCE_CHALLENGE`
- `VIP_TIER_MIGRATION`
- `PRODUCT_DROP_PARTICIPATION_CAMPAIGN`
- `SUSTAINABILITY_OR_MISSION_CHALLENGE`

## Implementation

Scoring lives in:

```text
src/server/scoring/communityFlywheel.ts
```

Core functions:

- `calculateCommunityFlywheelRatio`
- `classifyCfrTier`
- `estimateEarnedCommunityGrowth`
- `estimateSubsidizedTransactionalGrowth`
- `detectCommunityFlywheelLeaks`
- `recommendCommunityFlywheelPlays`
- `explainCfr`

Persistence models:

- `CommunityFlywheelSnapshot`
- `CommunityFlywheelLeak`
- `CommunityFlywheelPlay`

## Confidence Rules

- Prospecting estimates are capped and confidence-scored.
- Missing data lowers confidence.
- Low ecommerce or retail evidence lowers confidence.
- Evidence-backed reviews, referrals, subscriptions, UGC, retail, and tool detections raise confidence.
- Do not invent exact revenue, customer metrics, social metrics, CAC, churn, or retention numbers.

## Example

```json
{
  "estimatedCfr": 0.82,
  "cfrConfidence": 0.61,
  "cfrTier": "Emerging Community Loop",
  "earnedCommunityGrowth": 58,
  "subsidizedTransactionalGrowth": 71,
  "primaryLeak": "POINTS_ONLY_LOYALTY",
  "recommendedPlay": "VIP_TIER_MIGRATION"
}
```
