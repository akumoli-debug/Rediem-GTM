# GTM Diagnostic Metrics

Rediem's GTM diagnostic system is built for participation-led commerce: consumer brands where customers already review, refer, subscribe, share, buy in retail, follow drops, or participate around mission and identity, but where those behaviors are not yet captured into an owned community growth loop.

Community Flywheel Ratio, or CFR, is the first metric in the system. The rest of the diagnostics explain why CFR is high or low and which Rediem play should be recommended first.

These metrics are not generic enrichment fields. They are Rediem-native estimates that help an AE or marketer diagnose where customer participation is leaking out of the brand's owned system.

## Prospecting Rules

- Treat every public-data score as an estimate with confidence.
- Preserve source URLs, provider, capturedAt, raw excerpt, and confidence whenever available.
- Do not fabricate exact revenue, CAC, churn, retention, customer count, social follower count, conversion rate, or repeat-purchase metrics.
- Use low-confidence handling when a claim is unsupported: mark the signal as unknown, weak, or needs review instead of positive or negative.
- Prefer evidence-backed language: "visible discount pressure," "no public receipt-upload loop detected," or "reviews appear disconnected from rewards."
- Cap prospecting confidence when public evidence is thin, ecommerce is unconfirmed, or the signal depends on private customer behavior.
- Use customer-mode metrics only when Rediem, CRM, ecommerce, loyalty, subscription, or analytics data has been provided by the brand.

## Diagnostic Summary

| Metric | What It Diagnoses | Primary Rediem Plays |
| --- | --- | --- |
| Community Flywheel Ratio, CFR | Earned participation growth versus subsidized transactional growth | VIP tier migration, review-to-referral challenge, UGC challenge, retail receipt upload |
| Participation Capture Gap, PCG | Customer participation that exists but is not captured into owned profiles or rewards | VIP tier migration, review-to-referral challenge, zero-party preference challenge |
| Retail-to-Community Bridge Index, RCBI | Whether retail buyers can become owned community members | Retail receipt upload, subscription reward series, review-to-referral challenge |
| Mission-to-Action Ratio, MAR | Whether mission language becomes customer action | Mission challenge, zero-party preference challenge, UGC challenge |
| UGC Verification Gap, UVG | Social content that is not tied to verified customers or owned members | UGC challenge, review-to-referral challenge |
| Discount Dependence Ratio, DDR | Reliance on discounting relative to participation rewards | VIP tier migration, subscription reward series, review-to-referral challenge |
| Zero-Party Data Depth, ZPDD | Depth of declared customer preference and intent capture | Zero-party preference challenge, subscription reward series |
| Product Drop Participation Score, PDPS | Whether drops create community participation, not only sell-through | Product drop participation, UGC challenge, VIP tier migration |
| Stack Fragmentation Index, SFI | How split participation data is across disconnected tools | VIP tier migration, retail receipt upload, zero-party preference challenge |
| Owned Community Conversion Score, OCCS | Ability to convert social, retail, review, and UGC demand into owned community members | UGC challenge, retail receipt upload, review-to-referral challenge |

## 1. Community Flywheel Ratio, CFR

Plain-English definition: CFR estimates how much growth a brand creates from verified customer participation compared with how much growth it has to buy through discounts, points, paid acquisition, and one-off incentives.

Formula:

```text
CFR = Earned Community Growth / Subsidized Transactional Growth
```

Public signals used during prospecting:

- Reviews, verified review language, and review provider detection.
- Referral, ambassador, creator, affiliate, and UGC language.
- Subscription, replenishment, ritual, and repeat-use language.
- Loyalty, rewards, VIP, points, and earn/redeem pages.
- Discount, coupon, sale, promo code, and winback language.
- Retail, marketplace, store locator, and receipt-upload signals.
- Preference quiz, profile, survey, routine, or zero-party data flows.

What Rediem can do about it: identify the primary flywheel leak, recommend the first participation play, and move the brand from transactional loyalty into owned, verified community behaviors.

Strongest buyer persona: CMO, VP Growth, VP Ecommerce, VP Customer Experience, Director of Retention, Loyalty Manager.

Example outbound angle: "Your customers already review, subscribe, and show up around the brand, but the visible retention motion still looks discount- and points-led. Rediem can help turn those behaviors into an owned participation loop instead of another subsidy loop."

Confidence and safety rules:

- Prospecting CFR is conservative and confidence-scored.
- Do not claim "Iconic Brand Flywheel" from public signals alone.
- Do not infer exact revenue, CAC, churn, retention, customer count, or conversion rates.
- Lower confidence when ecommerce, participation, or evidence URLs are missing.
- Raise confidence when reviews, referrals, subscriptions, UGC, retail, and tool detections have source URLs.

Maps to Rediem plays:

- VIP tier migration when points-only loyalty or transactional reward bias is the leak.
- UGC challenge when social community exists but is not owned or verified.
- Retail receipt upload when retail buyers are invisible to DTC.
- Subscription reward series when subscribers lack participation milestones.
- Product drop participation when launches or limited drops are visible.
- Mission challenge when identity, wellness, sustainability, or education can become action.
- Review-to-referral challenge when reviews are isolated from advocacy.
- Zero-party preference challenge when declared customer intent is missing.

## 2. Participation Capture Gap, PCG

Plain-English definition: PCG estimates how much visible customer participation exists without being captured into owned profiles, rewards, referrals, or lifecycle programs.

Formula:

```text
PCG = Visible Participation Demand - Owned Participation Capture
```

Where both inputs are 0-100 evidence-backed indexes. Visible Participation Demand includes reviews, UGC, social community, referrals, ambassadors, drops, subscriptions, retail activity, and mission engagement. Owned Participation Capture includes loyalty, referral, profile, preference, receipt upload, subscription reward, and verified member flows.

Public signals used during prospecting:

- Reviews that are not connected to rewards or referrals.
- UGC, creator, ambassador, affiliate, or social challenge language.
- Strong social/community language with no visible owned member loop.
- Loyalty pages that reward purchases but not participation.
- Subscriptions or replenishment flows without community milestones.
- Retail or marketplace presence without receipt capture.

What Rediem can do about it: turn scattered participation into verified actions that update member profiles, trigger rewards, and create repeatable community loops.

Strongest buyer persona: Director of Retention, Loyalty Manager, Head of Community, VP Customer Experience, CRM Lead.

Example outbound angle: "Customers are already participating around the brand, but those actions appear split across reviews, social, and commerce. Rediem can capture those behaviors into owned member profiles and make them repeatable."

Confidence and safety rules:

- Estimate the gap from visible participation surfaces only.
- Do not describe the brand as having "lost" customers, revenue, or retention without first-party data.
- Mark PCG low-confidence when participation evidence is social-only or lacks source URLs.
- Treat a missing public loyalty page as "not detected," not "does not exist."

Maps to Rediem plays:

- VIP tier migration for points-led programs that do not reward community behaviors.
- Review-to-referral challenge for brands with reviews but weak referral capture.
- UGC challenge for social participation that is not owned.
- Zero-party preference challenge when the first owned action should be lightweight.
- Retail receipt upload when retail buyers are part of the participation gap.

## 3. Retail-to-Community Bridge Index, RCBI

Plain-English definition: RCBI estimates how ready a brand is to convert retail, marketplace, or wholesale buyers into owned community members with verified purchase history.

Formula:

```text
RCBI = weighted average(Retail Presence, Owned Commerce Surface, Participation Proof, Receipt Bridge Evidence)
```

Suggested weights: Retail Presence 35%, Owned Commerce Surface 20%, Participation Proof 25%, Receipt Bridge Evidence 20%.

Public signals used during prospecting:

- Store locator, retailer logos, marketplace listings, and "find us in store" pages.
- DTC ecommerce, subscriptions, loyalty, or member account flows.
- Reviews, UGC, referrals, social proof, and community language.
- Receipt upload, scan receipt, retail rewards, warranty registration, or post-purchase verification.

What Rediem can do about it: launch a receipt-upload path that turns retail buyers into owned community members, then routes them into reviews, referrals, preferences, and subscriptions.

Strongest buyer persona: VP Ecommerce, Chief Digital Officer, Director of Retail Marketing, CRM Lead, Head of Omnichannel.

Example outbound angle: "Retail is creating reach, but the public journey does not clearly pull those buyers into owned community. Rediem can use receipt verification to connect retail purchases to member profiles, rewards, and follow-on DTC actions."

Confidence and safety rules:

- Do not estimate retail sales volume from retailer presence.
- Distinguish "retail presence detected" from "retail buyers are unowned."
- Raise confidence when retailer pages, store locator URLs, marketplace pages, or receipt language are captured.
- Lower confidence when retail evidence comes only from third-party snippets.

Maps to Rediem plays:

- Retail receipt upload is the primary play.
- Subscription reward series when the category supports replenishment after retail purchase.
- Review-to-referral challenge when verified retail buyers can become advocates.
- Zero-party preference challenge when a receipt flow should collect taste, routine, or style preferences.

## 4. Mission-to-Action Ratio, MAR

Plain-English definition: MAR estimates whether a brand's mission, values, education, sustainability, or identity language gives customers something concrete to do.

Formula:

```text
MAR = Mission-Linked Customer Actions / Mission Narrative Intensity
```

Mission-Linked Customer Actions is a 0-100 index of challenges, pledges, education completions, quizzes, community submissions, review prompts, recycling/refill actions, and mission-tied rewards. Mission Narrative Intensity is a 0-100 index of public mission, sustainability, wellness, science, education, clean ingredient, identity, or values language.

Public signals used during prospecting:

- Mission, sustainability, wellness, education, trust, clean ingredient, science, or identity pages.
- Recycling, refill, giveback, impact, or advocacy programs.
- Quizzes, routines, preferences, education modules, challenges, or community submissions.
- UGC or review prompts tied to customer stories, outcomes, or values.

What Rediem can do about it: convert mission narrative into mission-linked participation, then reward customers for actions that strengthen identity, advocacy, and declared preferences.

Strongest buyer persona: CMO, Brand Manager, Head of Community, VP Customer Experience, Founder.

Example outbound angle: "The mission is clear, but the public customer journey gives people limited ways to participate in it. Rediem can turn the mission into verified challenges, stories, preferences, and rewards."

Confidence and safety rules:

- Do not judge mission authenticity from public copy.
- Score only the visibility of action paths tied to mission.
- Avoid impact claims unless the brand provides verified impact data.
- Lower confidence when mission language is broad and no customer action path is visible.

Maps to Rediem plays:

- Mission challenge is the primary play.
- Zero-party preference challenge when mission can become declared goals, values, routines, or preferences.
- UGC challenge when customers can submit stories or proof of mission-aligned behavior.
- Review-to-referral challenge when customer outcomes can become advocacy.

## 5. UGC Verification Gap, UVG

Plain-English definition: UVG estimates the gap between visible UGC or creator energy and the brand's ability to verify participation against a purchase, member profile, or owned customer record.

Formula:

```text
UVG = Public UGC Energy - Verified UGC Capture
```

Public UGC Energy includes UGC calls-to-action, creator/ambassador programs, social proof, tagged content, and community language. Verified UGC Capture includes member sign-up, purchase verification, receipt upload, verified customer language, review-to-social flows, or reward eligibility tied to owned identity.

Public signals used during prospecting:

- UGC, creator, ambassador, affiliate, TikTok, Instagram, social challenge, and "tag us" language.
- Social galleries and creator pages.
- Verified customer, verified buyer, purchase verified, receipt upload, or member-only reward language.
- Review provider and loyalty provider detections that could connect UGC to rewards.

What Rediem can do about it: make UGC rewardable only when tied to verified customers or members, converting social energy into owned community data.

Strongest buyer persona: Head of Community, Social Media Manager, Influencer Manager, VP Growth, Director of Retention.

Example outbound angle: "The brand has visible creator and UGC energy, but public evidence does not show that content being verified against customer identity. Rediem can make UGC a verified participation loop, not just a social campaign."

Confidence and safety rules:

- Do not estimate UGC volume from public social presence unless exact counts are sourced.
- Use "UGC verification not detected" instead of "UGC is unverified" when evidence is incomplete.
- Lower confidence when social URLs are missing or inaccessible.
- Raise confidence when UGC calls-to-action and member verification language are both present.

Maps to Rediem plays:

- UGC challenge is the primary play.
- Review-to-referral challenge when verified reviews can seed social advocacy.
- VIP tier migration when UGC should count toward status, not only purchases.
- Retail receipt upload when retail buyers need verification before UGC rewards.

## 6. Discount Dependence Ratio, DDR

Plain-English definition: DDR estimates how much the brand's retention and conversion language leans on discounts compared with participation-based rewards.

Formula:

```text
DDR = Discount/Subsidy Pressure / Participation Reward Depth
```

Discount/Subsidy Pressure is a 0-100 index of discount, sale, coupon, promo code, clearance, first-purchase offer, cash-back, winback, and dollars-off language. Participation Reward Depth is a 0-100 index of rewards tied to reviews, referrals, UGC, preferences, subscriptions, receipt uploads, mission actions, or VIP behaviors.

Public signals used during prospecting:

- Homepage, pop-up, loyalty, SMS/email capture, sale, and rewards page language.
- Points, cash-back, dollars-off, earn/redeem, and coupon-heavy loyalty mechanics.
- Participation rewards for reviews, referrals, UGC, subscriptions, preferences, or mission.
- Winback, lapsed customer, cancellation, or reactivate language.

What Rediem can do about it: replace part of the discount habit with participation-triggered value, especially through VIP tiers, subscriber milestones, review-to-referral loops, and mission challenges.

Strongest buyer persona: Director of Retention, VP Growth, CMO, Loyalty Manager, Lifecycle Marketing Lead.

Example outbound angle: "The public retention motion appears discount-heavy. Rediem can keep the incentive, but move more of it behind verified participation so customers earn status and access instead of waiting for the next promo."

Confidence and safety rules:

- Do not infer margin pressure, CAC, or promo spend from public discount language.
- Score discount pressure as visible GTM behavior, not financial performance.
- Keep confidence modest when discount evidence comes from one page or a seasonal campaign.
- Avoid shaming language; frame the opportunity as moving subsidy into participation.

Maps to Rediem plays:

- VIP tier migration for points, cash-back, or dollars-off programs.
- Subscription reward series when subscribers can earn through renewal and preference milestones.
- Review-to-referral challenge when discounts can be swapped for advocacy prompts.
- Product drop participation when access can replace blanket launch discounts.

## 7. Zero-Party Data Depth, ZPDD

Plain-English definition: ZPDD estimates how deeply the brand captures declared customer preferences, goals, routines, tastes, fit, style, or intent that can personalize participation.

Formula:

```text
ZPDD = average(Preference Capture Breadth, Preference Capture Specificity, Reward/Personalization Connection)
```

Each component is scored 0-100 and averaged. Breadth measures how many preference surfaces exist. Specificity measures whether the brand captures useful declared attributes. Reward/Personalization Connection measures whether preferences clearly affect recommendations, rewards, subscriptions, or community actions.

Public signals used during prospecting:

- Quiz, preference center, survey, profile, routine, goal, skin type, flavor, size, style, replenishment, or personalization language.
- Account profile, member onboarding, subscription preference, and recommendation flows.
- Rewards or challenges tied to completing a profile or updating preferences.
- Educational journeys that ask customers to declare needs or goals.

What Rediem can do about it: launch preference challenges that reward customers for declaring intent, then use those attributes to personalize community actions, rewards, referrals, and subscriptions.

Strongest buyer persona: CRM Lead, Lifecycle Marketing Lead, Director of Retention, VP Customer Experience, Ecommerce Manager.

Example outbound angle: "The brand has a natural preference story, but public evidence suggests declared customer data is shallow or disconnected from rewards. Rediem can make preference capture a rewarded community action."

Confidence and safety rules:

- Do not claim what data the brand stores internally from public forms alone.
- Score only visible depth and connection to customer action.
- Treat blocked or gated quizzes as partial evidence unless the fields are observable.
- Avoid collecting or storing sensitive personal attributes beyond the prospecting evidence needed for GTM review.

Maps to Rediem plays:

- Zero-party preference challenge is the primary play.
- Subscription reward series when preferences improve replenishment, routine, or renewal moments.
- Mission challenge when preferences express values, goals, or identity.
- VIP tier migration when profile completion can become a status behavior.

## 8. Product Drop Participation Score, PDPS

Plain-English definition: PDPS estimates whether product launches, limited editions, collaborations, restocks, and drops create owned community participation instead of only short-term transaction spikes.

Formula:

```text
PDPS = weighted average(Drop Attention, Owned Signup/Capture, Participation Mechanics, Post-Drop Loop)
```

Suggested weights: Drop Attention 30%, Owned Signup/Capture 25%, Participation Mechanics 25%, Post-Drop Loop 20%.

Public signals used during prospecting:

- Product drop, limited edition, collaboration, waitlist, restock, early access, launch, or exclusive language.
- VIP, member-only, community-only, or subscriber-first access.
- Share, refer, review, UGC, vote, quiz, or challenge mechanics around launches.
- Post-drop reviews, referrals, preference updates, and replenishment paths.

What Rediem can do about it: turn launch attention into join, share, review, refer, vote, and preference actions, so product drops build the owned community instead of ending at checkout.

Strongest buyer persona: VP Ecommerce, VP Growth, Brand Manager, Head of Community, CMO.

Example outbound angle: "The drop calendar creates attention, but public evidence does not show that attention compounding into owned member actions. Rediem can make each launch a participation campaign."

Confidence and safety rules:

- Do not estimate sell-through, waitlist size, or drop revenue from public launch pages.
- Score the presence of participation mechanics, not commercial success.
- Lower confidence when drop evidence is outdated or only found in press.
- Include captured dates for drop and launch evidence because timing decays quickly.

Maps to Rediem plays:

- Product drop participation is the primary play.
- UGC challenge when launches drive social content.
- VIP tier migration when early access should become a member-status benefit.
- Review-to-referral challenge when post-drop buyers can become advocates.

## 9. Stack Fragmentation Index, SFI

Plain-English definition: SFI estimates how fragmented the brand's participation data appears across loyalty, reviews, referrals, subscriptions, SMS/email, ecommerce, retail, UGC, and social systems.

Formula:

```text
SFI = Disconnected Participation Surfaces / Owned Community Connection Evidence
```

Disconnected Participation Surfaces is a count or 0-100 index of separate visible tools and channels. Owned Community Connection Evidence is a 0-100 index of public evidence that those surfaces write into shared profiles, rewards, or lifecycle actions.

Public signals used during prospecting:

- Loyalty, review, referral, subscription, SMS/email, quiz, ecommerce, and social tool detections.
- Separate pages for rewards, referrals, reviews, subscriptions, ambassadors, and retail rewards.
- Lack of visible member profile, status, reward, or preference connection across those pages.
- Language that suggests points-only loyalty while reviews, referrals, or UGC live elsewhere.

What Rediem can do about it: become the participation layer that connects fragmented customer behaviors into one owned member profile and set of GTM plays.

Strongest buyer persona: Chief Digital Officer, VP Ecommerce, Martech Lead, Director of Digital Product, CRM Lead.

Example outbound angle: "The stack appears to capture useful behaviors in separate places: reviews here, loyalty there, subscription somewhere else. Rediem can sit across those surfaces as the participation layer that makes the customer profile usable."

Confidence and safety rules:

- Do not claim exact internal architecture from public tool detections.
- Say "appears fragmented" or "no public connection detected" unless integration evidence is explicit.
- Raise confidence when multiple provider detections have URLs and excerpts.
- Lower confidence when vendor detection is weak, generic, or inferred from script names only.

Maps to Rediem plays:

- VIP tier migration when loyalty is the natural consolidation surface.
- Zero-party preference challenge when profile depth should become the connective tissue.
- Retail receipt upload when retail is disconnected from DTC.
- Review-to-referral challenge when reviews and advocacy are split.

## 10. Owned Community Conversion Score, OCCS

Plain-English definition: OCCS estimates how well the brand can convert public community energy from social, reviews, UGC, retail, referrals, and drops into owned members with repeatable participation paths.

Formula:

```text
OCCS = Owned Conversion Surfaces / Public Community Demand
```

Owned Conversion Surfaces is a 0-100 index of member sign-up, loyalty enrollment, referral join, receipt upload, preference completion, subscription onboarding, and challenge participation paths. Public Community Demand is a 0-100 index of social community, reviews, UGC, retail demand, product drops, ambassadors, and mission engagement.

Public signals used during prospecting:

- Community, creator, ambassador, UGC, review, referral, retail, and drop signals.
- Email/SMS capture, account creation, loyalty enrollment, profile completion, receipt upload, and challenge pages.
- Owned calls-to-action that connect social or retail audiences to member identity.
- Follow-on actions after a customer joins, reviews, uploads, refers, or subscribes.

What Rediem can do about it: convert public demand into owned membership, then sequence the next best participation action for each member.

Strongest buyer persona: VP Growth, Head of Community, Director of Retention, CRM Lead, VP Customer Experience.

Example outbound angle: "The brand has public community energy, but the owned conversion path looks thinner than the demand. Rediem can turn that attention into member profiles, verified actions, and repeatable participation."

Confidence and safety rules:

- Do not estimate community conversion rate from public paths.
- Score visible owned conversion readiness, not actual performance.
- Lower confidence when social, retail, or review evidence is missing.
- Raise confidence when owned sign-up paths and participation actions are both evidenced with source URLs.

Maps to Rediem plays:

- UGC challenge when social energy should convert into owned members.
- Retail receipt upload when retail buyers need an owned identity path.
- Review-to-referral challenge when reviewers can become advocates.
- Zero-party preference challenge when the lightest owned conversion is profile completion.
- Product drop participation when launch traffic should become community membership.

## Metric Selection For Outbound

Use CFR as the headline diagnostic when the account has enough visible participation and subsidy evidence to support a ratio. Use the supporting diagnostics to choose the first message.

| If The Evidence Shows | Lead With | First Recommended Play |
| --- | --- | --- |
| Points, VIP, discounts, and scattered reviews or referrals | CFR, DDR, PCG | VIP tier migration |
| Social energy, UGC, ambassadors, or creators without verification | UVG, OCCS, PCG | UGC challenge |
| Retail/store locator/marketplace plus weak owned capture | RCBI, OCCS, CFR | Retail receipt upload |
| Subscription or replenishment without participation milestones | DDR, ZPDD, CFR | Subscription reward series |
| Launches, limited drops, collabs, or waitlists | PDPS, OCCS, CFR | Product drop participation |
| Mission, sustainability, education, wellness, or identity language | MAR, ZPDD, PCG | Mission challenge |
| Reviews exist but referral capture is weak | PCG, CFR, OCCS | Review-to-referral challenge |
| Quiz/profile/preference opportunity but shallow visible capture | ZPDD, PCG, OCCS | Zero-party preference challenge |

## Implementation Notes

Existing scoring already supports the first wave of this system:

- `src/server/scoring/communityFlywheel.ts` estimates CFR, detects flywheel leaks, and recommends Rediem plays.
- `src/server/scoring/rediem.ts` scores Rediem fit components including participation capture gap, retail-to-owned-data opportunity, mission identity, and stack migration.
- `src/server/scoring/communityArchetypes.ts` classifies community archetypes and related component scores.

Future implementation should keep the same shape:

- Return a numeric estimate, confidence, source URLs, evidence IDs, plain-English explanation, strongest persona, and recommended play.
- Separate prospecting mode from customer mode.
- Keep low-confidence claims visibly low confidence.
- Store diagnostic outputs as GTM guidance, not as fabricated customer analytics.
