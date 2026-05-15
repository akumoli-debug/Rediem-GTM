import type { RediemBrandProfileInput, RediemSignalInput } from "./rediem";

export type RediemPersonaGroup =
  | "economicBuyer"
  | "operatorBuyer"
  | "technicalBuyer"
  | "influencer"
  | "unknown";

export type RediemDepartment =
  | "Executive"
  | "Marketing"
  | "Ecommerce"
  | "Growth"
  | "Retention"
  | "Lifecycle"
  | "CRM"
  | "Loyalty"
  | "Community"
  | "Customer Experience"
  | "Digital Product"
  | "Martech"
  | "Brand"
  | "Social"
  | "Unknown";

export type RediemSeniority =
  | "Founder"
  | "C-Level"
  | "VP"
  | "Head"
  | "Director"
  | "Manager"
  | "Lead"
  | "Individual Contributor"
  | "Unknown";

export type RediemNormalizedTitle = {
  title: string;
  personaGroup: RediemPersonaGroup;
  department: RediemDepartment;
  seniority: RediemSeniority;
  matchedKeywords: string[];
  angle: string;
};

export type RediemPersonScoringInput = {
  title: string;
  department?: RediemDepartment | string | null;
  seniority?: RediemSeniority | string | null;
  brandProfile?: RediemBrandProfileInput | null;
  recentSignals?: RediemSignalInput[];
  contactabilityScore?: number | null;
  sourceConfidence?: number | null;
};

export type RediemPersonScore = {
  personRediemScore: number;
  titleFit: number;
  departmentFit: number;
  seniorityFit: number;
  brandProfileFit: number;
  recentSignalRelevance: number;
  contactability: number;
  sourceConfidence: number;
};

type RediemTitleRule = {
  personaGroup: RediemPersonaGroup;
  department: RediemDepartment;
  keywords: string[];
  titleFit: number;
  angle: string;
};

const TITLE_RULES: RediemTitleRule[] = [
  {
    personaGroup: "economicBuyer",
    department: "Executive",
    keywords: ["cmo", "chief marketing", "chief digital", "chief customer", "founder", "co-founder", "ceo"],
    titleFit: 96,
    angle: "brand growth, retention economics, and customer loyalty strategy"
  },
  {
    personaGroup: "economicBuyer",
    department: "Ecommerce",
    keywords: ["vp ecommerce", "vp e-commerce", "vice president ecommerce", "vice president e-commerce", "vp digital commerce", "vp digital"],
    titleFit: 94,
    angle: "commerce conversion, retention, and post-purchase engagement"
  },
  {
    personaGroup: "economicBuyer",
    department: "Marketing",
    keywords: ["vp marketing", "vice president marketing"],
    titleFit: 92,
    angle: "owned community growth, lifecycle performance, and campaign leverage"
  },
  {
    personaGroup: "economicBuyer",
    department: "Growth",
    keywords: ["vp growth", "vice president growth", "head of growth"],
    titleFit: 90,
    angle: "repeat purchase, referral loops, and activation experiments"
  },
  {
    personaGroup: "economicBuyer",
    department: "Customer Experience",
    keywords: ["vp customer experience", "vp cx", "vice president customer experience", "head of customer experience"],
    titleFit: 88,
    angle: "customer engagement, advocacy, and post-purchase experience"
  },
  {
    personaGroup: "operatorBuyer",
    department: "Retention",
    keywords: ["director of retention", "retention director", "head of retention", "retention manager"],
    titleFit: 96,
    angle: "retention lifts, repeat purchase journeys, and loyalty program performance"
  },
  {
    personaGroup: "operatorBuyer",
    department: "Lifecycle",
    keywords: ["director of lifecycle", "lifecycle marketing manager", "lifecycle manager", "lifecycle marketing"],
    titleFit: 94,
    angle: "lifecycle messaging, segmentation, and behavior-triggered engagement"
  },
  {
    personaGroup: "operatorBuyer",
    department: "CRM",
    keywords: ["crm lead", "crm manager", "crm marketing", "customer relationship management"],
    titleFit: 92,
    angle: "zero-party data, owned channels, and CRM-ready customer attributes"
  },
  {
    personaGroup: "operatorBuyer",
    department: "Loyalty",
    keywords: ["loyalty manager", "loyalty lead", "head of loyalty", "loyalty program"],
    titleFit: 96,
    angle: "loyalty migration, richer rewards, and community participation"
  },
  {
    personaGroup: "operatorBuyer",
    department: "Community",
    keywords: ["head of community", "community lead", "community manager", "community marketing"],
    titleFit: 90,
    angle: "member participation, UGC loops, and ambassador activation"
  },
  {
    personaGroup: "operatorBuyer",
    department: "Growth",
    keywords: ["growth marketing manager", "growth marketer"],
    titleFit: 84,
    angle: "activation experiments, referrals, and repeat purchase campaigns"
  },
  {
    personaGroup: "operatorBuyer",
    department: "Ecommerce",
    keywords: ["ecommerce manager", "e-commerce manager"],
    titleFit: 84,
    angle: "commerce merchandising, conversion, and loyalty surface area"
  },
  {
    personaGroup: "technicalBuyer",
    department: "Ecommerce",
    keywords: ["head of ecommerce", "head of e-commerce", "shopify plus manager", "shopify manager"],
    titleFit: 90,
    angle: "implementation effort, Shopify compatibility, and data flows"
  },
  {
    personaGroup: "technicalBuyer",
    department: "Digital Product",
    keywords: ["director of digital product", "digital product director", "digital product"],
    titleFit: 86,
    angle: "customer experience roadmap and onsite engagement surfaces"
  },
  {
    personaGroup: "technicalBuyer",
    department: "Martech",
    keywords: ["martech lead", "marketing technology", "marketing ops", "marketing operations"],
    titleFit: 88,
    angle: "martech integration, event tracking, and operational complexity"
  },
  {
    personaGroup: "influencer",
    department: "Social",
    keywords: ["social media manager", "social manager", "social media lead"],
    titleFit: 82,
    angle: "UGC, creator participation, and community content"
  },
  {
    personaGroup: "influencer",
    department: "Community",
    keywords: ["influencer manager", "influencer marketing", "community manager", "creator manager"],
    titleFit: 84,
    angle: "creator programs, ambassador loops, and social proof"
  },
  {
    personaGroup: "influencer",
    department: "Brand",
    keywords: ["brand manager", "brand marketing", "director of brand"],
    titleFit: 78,
    angle: "brand storytelling, mission-led participation, and customer advocacy"
  },
  {
    personaGroup: "influencer",
    department: "Customer Experience",
    keywords: ["customer experience lead", "cx lead", "customer experience manager"],
    titleFit: 78,
    angle: "customer advocacy and post-purchase moments"
  }
];

export const REDIEM_ROLE_HINTS = [
  "CMO",
  "Chief Digital Officer",
  "VP Marketing",
  "VP Ecommerce",
  "VP Growth",
  "VP Customer Experience",
  "Director of Retention",
  "Director of Lifecycle Marketing",
  "CRM Lead",
  "Loyalty Manager",
  "Head of Community",
  "Growth Marketing Manager",
  "Ecommerce Manager",
  "Head of Ecommerce",
  "Shopify Plus Manager",
  "Director of Digital Product",
  "Martech Lead",
  "Social Media Manager",
  "Influencer Manager",
  "Community Manager",
  "Brand Manager",
  "Customer Experience Lead",
  "Founder"
];

export function normalizeRediemTitle(title: string): RediemNormalizedTitle {
  const normalizedTitle = normalizeText(title);
  const rule =
    TITLE_RULES.find((candidate) =>
      candidate.keywords.some((keyword) => normalizedTitle.includes(keyword))
    ) ?? inferFallbackRule(normalizedTitle);
  const matchedKeywords =
    rule?.keywords.filter((keyword) => normalizedTitle.includes(keyword)) ?? [];

  return {
    title,
    personaGroup: rule?.personaGroup ?? "unknown",
    department: rule?.department ?? inferDepartment(normalizedTitle),
    seniority: inferSeniority(normalizedTitle),
    matchedKeywords,
    angle: rule?.angle ?? "brand community and retention fit"
  };
}

export function scorePersonForRediem(input: RediemPersonScoringInput): RediemPersonScore {
  const normalized = normalizeRediemTitle(input.title);
  const department = input.department ?? normalized.department;
  const seniority = input.seniority ?? normalized.seniority;
  const titleFit = titleFitFor(normalized);
  const departmentFit = departmentFitFor(String(department), normalized.personaGroup);
  const seniorityFit = seniorityFitFor(String(seniority), normalized.personaGroup);
  const brandProfileFit = brandProfileFitFor(input.brandProfile, normalized.personaGroup);
  const recentSignalRelevance = recentSignalRelevanceFor(
    input.recentSignals ?? [],
    normalized.personaGroup
  );
  const contactability = clampScore(input.contactabilityScore ?? 45);
  const sourceConfidence = clampScore(
    (input.sourceConfidence ?? 0.55) <= 1
      ? (input.sourceConfidence ?? 0.55) * 100
      : input.sourceConfidence ?? 55
  );

  return {
    personRediemScore: clampScore(
      Math.round(
        0.25 * titleFit +
          0.2 * departmentFit +
          0.15 * seniorityFit +
          0.15 * brandProfileFit +
          0.1 * recentSignalRelevance +
          0.1 * contactability +
          0.05 * sourceConfidence
      )
    ),
    titleFit,
    departmentFit,
    seniorityFit,
    brandProfileFit,
    recentSignalRelevance,
    contactability,
    sourceConfidence
  };
}

export function rediemPersonaAngle(personaGroup: RediemPersonaGroup): string {
  switch (personaGroup) {
    case "economicBuyer":
      return "revenue impact, retention strategy, and customer loyalty differentiation";
    case "operatorBuyer":
      return "campaign execution, loyalty mechanics, lifecycle lift, and community participation";
    case "technicalBuyer":
      return "Shopify compatibility, integration complexity, data flows, and implementation risk";
    case "influencer":
      return "UGC, creator/community participation, brand storytelling, and customer advocacy";
    case "unknown":
      return "brand community and retention fit";
  }
}

function titleFitFor(normalized: RediemNormalizedTitle): number {
  if (normalized.personaGroup === "unknown") {
    return 25;
  }

  const rule = TITLE_RULES.find((candidate) =>
    candidate.keywords.some((keyword) => normalizeText(normalized.title).includes(keyword))
  );

  return rule?.titleFit ?? 70;
}

function departmentFitFor(department: string, personaGroup: RediemPersonaGroup): number {
  const normalized = normalizeText(department);
  const operatorDepartments = ["retention", "lifecycle", "crm", "loyalty", "community", "growth", "ecommerce"];
  const technicalDepartments = ["ecommerce", "digital product", "martech"];
  const economicDepartments = ["executive", "marketing", "ecommerce", "growth", "customer experience"];
  const influencerDepartments = ["social", "community", "brand", "customer experience"];
  const byPersona: Record<RediemPersonaGroup, string[]> = {
    economicBuyer: economicDepartments,
    operatorBuyer: operatorDepartments,
    technicalBuyer: technicalDepartments,
    influencer: influencerDepartments,
    unknown: []
  };

  return byPersona[personaGroup].some((keyword) => normalized.includes(keyword))
    ? 92
    : personaGroup === "unknown"
      ? 30
      : 55;
}

function seniorityFitFor(seniority: string, personaGroup: RediemPersonaGroup): number {
  if (personaGroup === "economicBuyer") {
    return ["Founder", "C-Level", "VP", "Head"].includes(seniority) ? 94 : 55;
  }

  if (personaGroup === "operatorBuyer") {
    return ["Head", "Director", "Manager", "Lead", "VP"].includes(seniority) ? 88 : 58;
  }

  if (personaGroup === "technicalBuyer") {
    return ["Head", "Director", "Manager", "Lead", "VP"].includes(seniority) ? 86 : 58;
  }

  if (personaGroup === "influencer") {
    return ["Director", "Manager", "Lead", "Head"].includes(seniority) ? 80 : 55;
  }

  return 35;
}

function brandProfileFitFor(
  profile: RediemBrandProfileInput | null | undefined,
  personaGroup: RediemPersonaGroup
): number {
  if (!profile) {
    return 45;
  }

  const base = profile.rediemFitScore ?? 50;

  if (personaGroup === "economicBuyer") {
    return clampScore(base + (profile.hasSubscription ? 8 : 0) + (profile.hasRetailPresence ? 5 : 0));
  }

  if (personaGroup === "operatorBuyer") {
    return clampScore(
      base +
        (profile.hasLoyaltyProgram ? 8 : 0) +
        (profile.hasSubscription ? 6 : 0) +
        (profile.hasUGC ? 6 : 0)
    );
  }

  if (personaGroup === "technicalBuyer") {
    return clampScore(
      base +
        (profile.shopifyDetected ? 10 : 0) +
        (profile.shopifyPlusLikely ? 6 : 0) +
        (profile.migrationPainScore ? 4 : 0)
    );
  }

  if (personaGroup === "influencer") {
    return clampScore(base + (profile.hasUGC ? 12 : 0) + (profile.socialCommunityScore ?? 0) * 0.1);
  }

  return Math.round(base * 0.5);
}

function recentSignalRelevanceFor(
  signals: RediemSignalInput[],
  personaGroup: RediemPersonaGroup
): number {
  if (signals.length === 0) {
    return 40;
  }

  const keywordsByPersona: Record<RediemPersonaGroup, string[]> = {
    economicBuyer: ["retention", "growth", "subscription", "retail", "loyalty"],
    operatorBuyer: ["loyalty", "subscription", "reviews", "community", "ugc", "crm"],
    technicalBuyer: ["shopify", "migration", "integration", "martech", "ecommerce"],
    influencer: ["ugc", "community", "creator", "social", "ambassador"],
    unknown: []
  };
  const text = signals
    .map((signal) => `${signal.type ?? ""} ${signal.title ?? ""} ${signal.description ?? ""}`)
    .join(" ")
    .toLowerCase();
  const keywordBoost = Math.min(
    30,
    keywordsByPersona[personaGroup].reduce(
      (sum, keyword) => sum + (text.includes(keyword) ? 8 : 0),
      0
    )
  );
  const maxSignalScore = Math.max(0, ...signals.map((signal) => signal.totalScore ?? 0));
  // Mirror the same logic as calculateTimingSignalScore: 45 only when signals
  // exist but carry no totalScore (unscored), not when they scored 0.
  const hasUnscoredSignals = signals.some((s) => s.totalScore == null);
  const signalBase = maxSignalScore > 0 ? maxSignalScore : hasUnscoredSignals ? 45 : 0;

  return clampScore(Math.round(signalBase * 0.65 + keywordBoost));
}

function inferFallbackRule(normalizedTitle: string): RediemTitleRule | null {
  if (normalizedTitle.includes("founder") || /\bceo\b/.test(normalizedTitle)) {
    return TITLE_RULES[0] ?? null;
  }

  if (normalizedTitle.includes("ecommerce") || normalizedTitle.includes("e-commerce")) {
    return {
      personaGroup: "technicalBuyer",
      department: "Ecommerce",
      keywords: ["ecommerce", "e-commerce"],
      titleFit: 76,
      angle: "commerce operations and implementation fit"
    };
  }

  if (normalizedTitle.includes("marketing")) {
    return {
      personaGroup: "operatorBuyer",
      department: "Marketing",
      keywords: ["marketing"],
      titleFit: 68,
      angle: "campaign execution and lifecycle lift"
    };
  }

  // Director/Manager of CX — VP and Head level are caught by TITLE_RULES; Director and below is operator
  if (normalizedTitle.includes("customer experience") || /\bcx\b/.test(normalizedTitle)) {
    return {
      personaGroup: "operatorBuyer",
      department: "Customer Experience",
      keywords: ["customer experience", "cx"],
      titleFit: 82,
      angle: "customer advocacy, post-purchase experience, and retention lift"
    };
  }

  // Head/Director of Digital without "product" or "commerce" (those match TITLE_RULES before reaching here)
  if (normalizedTitle.includes("digital")) {
    return {
      personaGroup: "technicalBuyer",
      department: "Digital Product",
      keywords: ["digital"],
      titleFit: 80,
      angle: "digital channel operations, integration complexity, and onsite engagement"
    };
  }

  return null;
}

function inferDepartment(normalizedTitle: string): RediemDepartment {
  if (normalizedTitle.includes("crm")) return "CRM";
  if (normalizedTitle.includes("loyalty")) return "Loyalty";
  if (normalizedTitle.includes("lifecycle")) return "Lifecycle";
  if (normalizedTitle.includes("retention")) return "Retention";
  if (normalizedTitle.includes("community")) return "Community";
  if (normalizedTitle.includes("ecommerce") || normalizedTitle.includes("e-commerce")) return "Ecommerce";
  if (normalizedTitle.includes("growth")) return "Growth";
  if (normalizedTitle.includes("social")) return "Social";
  if (normalizedTitle.includes("brand")) return "Brand";
  if (normalizedTitle.includes("martech") || normalizedTitle.includes("technology")) return "Martech";
  if (normalizedTitle.includes("customer experience") || normalizedTitle.includes("cx")) return "Customer Experience";
  if (normalizedTitle.includes("marketing")) return "Marketing";
  if (normalizedTitle.includes("chief") || normalizedTitle.includes("founder") || /\bceo\b|\bcmo\b/.test(normalizedTitle)) return "Executive";
  return "Unknown";
}

function inferSeniority(normalizedTitle: string): RediemSeniority {
  if (normalizedTitle.includes("founder")) return "Founder";
  if (normalizedTitle.includes("chief") || /\bceo\b|\bcmo\b/.test(normalizedTitle)) return "C-Level";
  if (/\bvp\b|vice president/.test(normalizedTitle)) return "VP";
  if (normalizedTitle.includes("head of")) return "Head";
  if (normalizedTitle.includes("director")) return "Director";
  if (normalizedTitle.includes("manager")) return "Manager";
  if (normalizedTitle.includes("lead")) return "Lead";
  if (normalizedTitle.trim().length > 0) return "Individual Contributor";
  return "Unknown";
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/&/g, "and").replace(/\s+/g, " ").trim();
}

function clampScore(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, value));
}
