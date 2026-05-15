import type { FormulaOutputType, FormulaScope } from "./types";

export type FormulaTemplateDefinition = {
  key: string;
  name: string;
  description: string;
  scope: FormulaScope;
  expression: string;
  outputType: FormulaOutputType;
};

// Templates are divided into two groups:
//   1. Generic B2B templates (account-tier through days-since-signal) — not shown in the
//      Rediem UI (getRediemFormulaData filters them out). Do not add new generic templates.
//   2. Rediem-specific templates (rediem-fit-score onward) — these are the active product.
//      CFR-related templates reference CommunityFlywheelSnapshot DB column names
//      (verifiedParticipationValue, rewardCostRatio, churnRecoveryCost) which match the
//      current Prisma schema. If those columns are renamed in a migration, update here too.
export const formulaTemplates: FormulaTemplateDefinition[] = [
  // ── Generic B2B templates (not shown in Rediem UI) ───────────────────────
  // These target enterprise SaaS motions and are not relevant to DTC brands.
  // Deferred cleanup: move to a separate genericTemplates export once the B2B path is archived.
  {
    key: "account-tier",
    name: "Account Tier",
    description: "Classifies accounts into three tiers from accountScore.",
    scope: "ACCOUNT",
    expression:
      'IF({account.accountScore} >= 85, "Tier 1", IF({account.accountScore} >= 65, "Tier 2", "Tier 3"))',
    outputType: "STRING"
  },
  {
    key: "outbound-ready",
    name: "Outbound Ready",
    description: "Flags accounts ready for outbound based on signal and account scores.",
    scope: "ACCOUNT",
    expression:
      'IF(AND({signal.maxScore} >= 70, {account.accountScore} >= 75), "Ready", "Review")',
    outputType: "STRING"
  },
  {
    key: "enterprise-motion",
    name: "Enterprise Motion",
    description: "Detects enterprise pricing or enterprise sales hiring evidence.",
    scope: "ACCOUNT",
    expression:
      'IF(OR(CONTAINS(LOWER({account.pricingSummary}), "enterprise"), CONTAINS(LOWER({account.careersSummary}), "enterprise account executive")), true, false)',
    outputType: "BOOLEAN"
  },
  {
    key: "hiring-momentum",
    name: "Hiring Momentum",
    description: "Scores hiring signals across sales, RevOps, and engineering language.",
    scope: "ACCOUNT",
    expression:
      'SCORE(IF(CONTAINS(LOWER({account.careersSummary}), "sales"), 15, 0), IF(CONTAINS(LOWER({account.careersSummary}), "revops"), 25, 0), IF(CONTAINS(LOWER({account.careersSummary}), "engineering"), 10, 0))',
    outputType: "NUMBER"
  },
  {
    key: "person-sequence-status",
    name: "Person Sequence Status",
    description: "Marks verified, high-fit contacts as sequence-ready.",
    scope: "PERSON",
    expression:
      'IF(AND({person.emailStatus} = "VERIFIED", {person.roleScore} >= 70, {person.contactabilityScore} >= 75), "Sequence", "Manual Review")',
    outputType: "STRING"
  },
  {
    key: "founder-led",
    name: "Founder-Led",
    description: "Detects founder or CEO titles.",
    scope: "PERSON",
    expression: 'REGEX_MATCH(LOWER({person.title}), "founder|co-founder|ceo")',
    outputType: "BOOLEAN"
  },
  {
    key: "revops-buyer",
    name: "RevOps Buyer",
    description: "Detects RevOps, revenue operations, sales operations, and GTM systems titles.",
    scope: "PERSON",
    expression:
      'REGEX_MATCH(LOWER({person.title}), "revops|revenue operations|sales operations|gtm systems")',
    outputType: "BOOLEAN"
  },
  {
    key: "days-since-signal",
    name: "Days Since Signal",
    description: "Calculates how many days have passed since the latest account signal.",
    scope: "ACCOUNT",
    expression: "DAYS_SINCE({signal.latestSignalDate})",
    outputType: "NUMBER"
  },
  // ── Rediem-specific templates ─────────────────────────────────────────────
  {
    key: "rediem-fit-score",
    name: "Rediem Fit Score",
    description: "Scores community-driven consumer brand fit from participation potential, capture gap, ritual fit, retail bridge, mission identity, stack migration, and timing.",
    scope: "ACCOUNT",
    expression:
      "ROUND(COALESCE({brand.rediemFitScore}, COALESCE({account.accountScore}, 0)), 0)",
    outputType: "NUMBER"
  },
  {
    key: "rediem-loyalty-pain-score",
    name: "Loyalty Pain Score",
    description: "Estimates loyalty migration or program-improvement pain.",
    scope: "ACCOUNT",
    expression:
      "MIN(100, SCORE(IF({account.hasLoyaltyProgram}, 45, 20), IF(CONTAINS(LOWER({account.loyaltyProgramType}), \"points\"), 20, 0), IF(CONTAINS(LOWER({account.loyaltyProgramType}), \"tier\"), 10, 0), IF({account.hasReferralProgram}, 8, 0), IF({account.hasSubscription}, 7, 0), IF({account.hasUGC}, 5, 0)))",
    outputType: "NUMBER"
  },
  {
    key: "rediem-community-readiness-score",
    name: "Community Readiness Score",
    description: "Scores whether a brand has the social, UGC, and mission hooks for community activation.",
    scope: "ACCOUNT",
    expression:
      "MIN(100, SCORE(COALESCE({account.socialCommunityScore}, 0), IF({account.hasUGC}, 18, 0), IF(EXISTS({account.instagramUrl}), 8, 0), IF(EXISTS({account.tiktokUrl}), 8, 0), IF(OR(EXISTS({account.missionDrivenAngle}), EXISTS({account.sustainabilityAngle})), 8, 0)))",
    outputType: "NUMBER"
  },
  {
    key: "rediem-migration-pain-score",
    name: "Migration Pain Score",
    description: "Scores likelihood that existing loyalty or commerce tooling creates migration opportunity.",
    scope: "ACCOUNT",
    expression:
      "MIN(100, SCORE(COALESCE({account.migrationPainScore}, 0), IF({account.hasLoyaltyProgram}, 22, 0), IF(CONTAINS(LOWER({account.loyaltyProgramType}), \"points\"), 12, 0), IF({account.shopifyPlusLikely}, 8, 0), IF({account.hasReviews}, 5, 0)))",
    outputType: "NUMBER"
  },
  {
    key: "rediem-agentic-commerce-score",
    name: "Agentic Commerce Score",
    description: "Scores readiness for agentic commerce experiences from commerce stack and engagement signals.",
    scope: "ACCOUNT",
    expression:
      "MIN(100, SCORE(COALESCE({account.agenticCommerceScore}, 0), IF(OR({account.shopifyDetected}, {account.shopifyPlusLikely}), 14, 0), IF({account.hasSubscription}, 12, 0), IF(OR({account.hasLoyaltyProgram}, {account.hasReferralProgram}), 10, 0), IF(OR({account.hasReviews}, {account.hasUGC}), 8, 0)))",
    outputType: "NUMBER"
  },
  {
    key: "rediem-tier",
    name: "Rediem Tier",
    description: "Classifies an account by Rediem fit score.",
    scope: "ACCOUNT",
    expression:
      "IF({brand.rediemFitScore} >= 85, \"Tier 1\", IF({brand.rediemFitScore} >= 70, \"Tier 2\", IF({brand.rediemFitScore} >= 55, \"Tier 3\", \"Pass\")))",
    outputType: "STRING"
  },
  {
    key: "rediem-points-loyalty-migration",
    name: "Points Loyalty Migration",
    description: "Flags Rediem migration opportunity when a brand has a points-based loyalty program.",
    scope: "ACCOUNT",
    expression:
      "IF(AND({brand.hasLoyaltyProgram}, {brand.loyaltyProgramType} = \"points\"), \"Migration Opportunity\", \"Not obvious\")",
    outputType: "STRING"
  },
  {
    key: "rediem-community-gap",
    name: "Community Gap",
    description: "Flags Rediem community gap when social reach is strong but UGC is not detected.",
    scope: "ACCOUNT",
    expression:
      "IF(AND({brand.socialCommunityScore} >= 70, {brand.hasUGC} = false), \"High community gap\", \"Normal\")",
    outputType: "STRING"
  },
  {
    key: "rediem-review-activation-fit",
    name: "Review Activation Fit",
    description: "Recommends Rediem review reward series for high-fit brands with review evidence.",
    scope: "ACCOUNT",
    expression:
      "IF(AND({brand.hasReviews}, {brand.rediemFitScore} >= 70), \"Pitch review reward series\", \"Lower priority\")",
    outputType: "STRING"
  },
  {
    key: "rediem-subscription-retention-fit",
    name: "Subscription Retention Fit",
    description: "Recommends Rediem subscription reward series when subscription and loyalty pain evidence align.",
    scope: "ACCOUNT",
    expression:
      "IF(AND({brand.hasSubscription}, {brand.loyaltyPainScore} >= 60), \"Pitch subscription reward series\", \"Lower priority\")",
    outputType: "STRING"
  },
  {
    key: "rediem-retail-to-dtc-fit",
    name: "Retail-to-DTC Fit",
    description: "Recommends Rediem receipt upload campaigns for retail brands with a detected commerce stack.",
    scope: "ACCOUNT",
    expression:
      "IF(AND({brand.hasRetailPresence}, {brand.shopifyDetected}), \"Pitch receipt upload challenge\", \"Lower priority\")",
    outputType: "STRING"
  },
  {
    key: "rediem-agentic-commerce-angle",
    name: "Agentic Commerce Angle",
    description: "Chooses the Rediem AI discoverability/community moat angle for agentic-commerce-ready brands.",
    scope: "ACCOUNT",
    expression:
      "IF({brand.agenticCommerceScore} >= 75, \"Use AI discoverability/community moat angle\", \"Use standard loyalty angle\")",
    outputType: "STRING"
  },
  {
    key: "rediem-ae-priority",
    name: "AE Priority",
    description: "Prioritizes Rediem AE action from fit score and migration pain.",
    scope: "ACCOUNT",
    expression:
      "IF(AND({brand.rediemFitScore} >= 80, {brand.migrationPainScore} >= 60), \"Work now\", IF({brand.rediemFitScore} >= 65, \"Nurture\", \"Skip\"))",
    outputType: "STRING"
  },
  {
    key: "cfr-tier",
    name: "CFR Tier",
    description: "Classifies the latest Community Flywheel Ratio estimate.",
    scope: "ACCOUNT",
    expression:
      "IF({brand.estimatedCfr} >= 2, \"Iconic Brand Flywheel\", IF({brand.estimatedCfr} >= 1, \"Healthy Community Flywheel\", IF({brand.estimatedCfr} >= 0.5, \"Emerging Community Loop\", \"Transactional Trap\")))",
    outputType: "STRING"
  },
  {
    key: "community-flywheel-upside",
    name: "Community Flywheel Upside",
    description: "Flags brands with Rediem fit but low current CFR.",
    scope: "ACCOUNT",
    expression:
      "IF(AND({brand.rediemFitScore} >= 70, {brand.estimatedCfr} < 1), \"High upside\", IF({brand.estimatedCfr} >= 1, \"Flywheel active\", \"Needs more evidence\"))",
    outputType: "STRING"
  },
  {
    key: "flywheel-leak-severity",
    name: "Flywheel Leak Severity",
    description: "Summarizes subsidy-side CFR leakage from discount, reward, CAC, and churn recovery estimates.",
    scope: "ACCOUNT",
    expression:
      "IF(MAX(COALESCE({brand.discountDependency}, 0), COALESCE({brand.rewardCostRatio}, 0), COALESCE({brand.paidCacDependency}, 0), COALESCE({brand.churnRecoveryCost}, 0)) >= 75, \"Severe\", IF(MAX(COALESCE({brand.discountDependency}, 0), COALESCE({brand.rewardCostRatio}, 0), COALESCE({brand.paidCacDependency}, 0), COALESCE({brand.churnRecoveryCost}, 0)) >= 55, \"Moderate\", \"Low\"))",
    outputType: "STRING"
  },
  {
    key: "first-play-recommendation",
    name: "First Play Recommendation",
    description: "Returns the first CFR play recommendation from the latest snapshot.",
    scope: "ACCOUNT",
    expression: "COALESCE({brand.recommendedPlay}, \"Run CFR estimate\")",
    outputType: "STRING"
  },
  {
    key: "discount-dependency-risk",
    name: "Discount Dependency Risk",
    description: "Flags when subsidized transactional growth appears discount-led.",
    scope: "ACCOUNT",
    expression:
      "IF({brand.discountDependency} >= 70, \"High discount risk\", IF({brand.discountDependency} >= 45, \"Watch discounting\", \"Low discount risk\"))",
    outputType: "STRING"
  },
  {
    key: "participation-capture-gap",
    name: "Participation Capture Gap",
    description: "Flags brands whose verified participation value trails social or commerce readiness.",
    scope: "ACCOUNT",
    expression:
      "IF(AND(COALESCE({brand.verifiedParticipationValue}, 0) < 50, OR({brand.hasReviews}, {brand.hasUGC}, COALESCE({brand.socialCommunityScore}, 0) >= 70)), \"Participation capture gap\", \"Participation captured\")",
    outputType: "STRING"
  },
  {
    key: "rediem-recommended-play",
    name: "Recommended Play",
    description: "Suggests an initial Rediem activation play from brand profile signals.",
    scope: "ACCOUNT",
    expression:
      "IF(AND({account.hasUGC}, COALESCE({account.socialCommunityScore}, 0) >= 75), \"UGC challenge\", IF({account.hasSubscription}, \"Subscription retention loop\", IF({account.hasLoyaltyProgram}, \"Loyalty migration audit\", \"Community readiness audit\")))",
    outputType: "STRING"
  }
];
