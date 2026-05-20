# Rediem GTM Playbook

This repo is designed for Rediem-specific GTM intelligence: identify consumer brands with latent customer participation, diagnose the participation gap, recommend a Rediem play, and export a clean action record for sales systems.

## ICP Thesis

Target community-driven consumer brands where customers already:

- Review products.
- Refer friends.
- Subscribe or replenish.
- Share UGC or social proof.
- Buy through retail and marketplaces.
- Follow drops, creators, ambassadors, or brand culture.
- Participate around mission, wellness, sustainability, identity, or education.

The pain is that this participation is usually fragmented across social, loyalty, reviews, subscriptions, SMS, retail, referrals, and paid acquisition. Rediem turns that fragmented participation into owned, measurable growth loops.

## What Is Not The ICP

Do not define ICP primarily by:

- Shopify usage
- Revenue band
- Employee count
- Generic B2B buying signals

Those fields can help filter or route accounts, but they are not the core Rediem thesis.

## Rediem Motions

### Loyalty Migration

Best for brands with:

- Points, VIP, earn/burn, or legacy rewards language
- Loyalty provider detection
- Reviews, social, subscriptions, referrals, or retail signals that are not clearly connected to loyalty

Primary message:

> Move from transactional points into participation-based loyalty that captures reviews, referrals, UGC, preferences, and repeat behaviors.

### Community Activation

Best for brands with:

- High social/community energy
- UGC, ambassadors, creators, affiliates, or cultural language
- Weak owned community or loyalty infrastructure

Primary message:

> Customers are already participating. Rediem helps turn that participation into owned profiles, incentives, and repeatable growth loops.

### Retail-to-Owned Data Bridge

Best for brands with:

- Retail locator or retailer mentions
- Marketplace presence
- DTC site or subscription program
- Reviews or social proof

Primary message:

> Convert retail buyers into owned community members through receipt upload, challenges, review rewards, and follow-on subscriptions.

### Subscription Retention

Best for brands with:

- Subscription provider or subscribe/replenish language
- Repeat-use category
- Reviews or loyalty program gaps

Primary message:

> Use participation rewards to improve renewal, replenishment, referral, and retention loops.

### CFR Diagnostic

Best for brands with:

- Visible community energy
- Discount-heavy or points-heavy growth
- Fragmented participation tools

Primary message:

> Rediem can estimate where earned community growth is leaking into subsidized transactional growth, then recommend the first loop to fix.

### GTM Diagnostic Metrics

CFR is the first Rediem-native diagnostic, but it should sit inside a broader participation-led commerce playbook. Use [docs/GTM_DIAGNOSTIC_METRICS.md](/docs/GTM_DIAGNOSTIC_METRICS.md) to diagnose the specific reason an account is a Rediem opportunity:

- Participation Capture Gap, or PCG: customers are participating, but the behavior is not captured into owned profiles or rewards.
- Retail-to-Community Bridge Index, or RCBI: retail buyers can be converted into owned community members through receipt verification.
- Mission-to-Action Ratio, or MAR: mission language exists, but customers need concrete actions to take.
- UGC Verification Gap, or UVG: social content is not clearly tied to verified customers or members.
- Discount Dependence Ratio, or DDR: retention appears more discount-led than participation-led.
- Zero-Party Data Depth, or ZPDD: declared customer preference data is shallow or disconnected from rewards.
- Product Drop Participation Score, or PDPS: launches and drops create attention that can become participation.
- Stack Fragmentation Index, or SFI: reviews, loyalty, subscriptions, referrals, social, and retail data appear split across tools.
- Owned Community Conversion Score, or OCCS: public community energy needs a stronger path into owned membership.

These diagnostics are prospecting estimates with confidence and source URLs. They should never imply exact revenue, CAC, churn, retention, customer count, or conversion metrics from public data.

## Buyer Personas

Economic buyers:

- CMO
- Chief Digital Officer
- VP Marketing
- VP Ecommerce
- VP Growth
- VP Customer Experience
- Founder or CEO for smaller brands

Operator buyers:

- Director of Retention
- Director of Lifecycle Marketing
- CRM Lead
- Loyalty Manager
- Head of Community
- Growth Marketing Manager
- Ecommerce Manager

Technical and integration buyers:

- Head of Ecommerce
- Shopify Plus Manager
- Director of Digital Product
- Martech Lead

Influencers:

- Social Media Manager
- Influencer or Community Manager
- Brand Manager
- Customer Experience Lead

## Recommended Workflow

1. Import brand domains.
2. Run `analyzeBrandForRediem`.
3. Review Rediem Fit Score, community archetypes, evidence, and CFR estimate.
4. Generate activation ideas.
5. Resolve Rediem buying committee.
6. Export account row, evidence URLs, recommended play, buyer personas, and verified contacts.
7. Send to CRM, n8n, Google Sheets/Airtable, or sequencer tools.

## Export Fields

Account fields:

- Domain
- Brand name
- Category
- Rediem Fit Score
- Rediem tier
- Community archetypes
- Community Energy
- Participation Capture Gap
- Retail-to-Owned Data Opportunity
- Loyalty maturity level
- CFR estimate
- CFR tier
- Primary leak
- Recommended play
- Activation idea
- Source URLs

Contact fields:

- Full name
- Title
- Rediem persona group
- Role score
- Email
- Email status
- Contactability score
- Suggested angle

## Quality Rules

- Do not fabricate exact revenue, customer count, social metrics, or conversion rates.
- Keep low-confidence claims visibly low confidence.
- Every positive claim should have evidence or a source URL when possible.
- Outbound-ready status should require verified email and contact safety checks.
