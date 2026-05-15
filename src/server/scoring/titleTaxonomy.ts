export type PersonaType =
  | "ECONOMIC_BUYER"
  | "TECHNICAL_BUYER"
  | "DAY_TO_DAY_OWNER"
  | "INFLUENCER"
  | "CHAMPION_CANDIDATE"
  | "BLOCKER_CANDIDATE"
  | "UNKNOWN";

export type TitleDepartment =
  | "Executive"
  | "Revenue"
  | "Revenue Operations"
  | "Growth"
  | "Engineering"
  | "Platform"
  | "Security"
  | "Finance"
  | "Product"
  | "Data"
  | "Operations"
  | "Unknown";

export type TitleSeniority =
  | "Founder"
  | "C-Level"
  | "VP"
  | "Head"
  | "Director"
  | "Manager"
  | "Individual Contributor"
  | "Unknown";

export type TitleRoleFamily =
  | "Founder/CEO"
  | "CRO/Revenue"
  | "VP Sales"
  | "RevOps/Sales Ops/GTM Systems"
  | "Growth/Marketing"
  | "Engineering"
  | "Platform/Infrastructure/DevOps/SRE"
  | "Security/Compliance"
  | "Finance/CFO/Controller"
  | "Product"
  | "Data/Analytics"
  | "Operations"
  | "Unknown";

export type NormalizedTitle = {
  title: string;
  seniority: TitleSeniority;
  department: TitleDepartment;
  personaType: PersonaType;
  roleFamily: TitleRoleFamily;
  matchedKeywords: string[];
};

export type PersonScoringInput = {
  title: string;
  motion: string;
  seniority?: TitleSeniority;
  department?: TitleDepartment;
  personaType?: PersonaType;
  contactabilityScore?: number;
  sourceConfidence?: number;
  recentSignals?: Array<{
    type?: string;
    title?: string;
    description?: string | null;
    totalScore?: number | null;
  }>;
  accountContext?: {
    industry?: string | null;
    websiteSummary?: string | null;
    pricingSummary?: string | null;
    careersSummary?: string | null;
  };
};

export type PersonScore = {
  personScore: number;
  roleMatch: number;
  seniorityMatch: number;
  departmentMatch: number;
  recentSignalMatch: number;
  accountContextMatch: number;
  contactabilityScore: number;
  sourceConfidence: number;
};

type TaxonomyRule = {
  roleFamily: TitleRoleFamily;
  keywords: string[];
  department: TitleDepartment;
  personaType: PersonaType;
};

const TAXONOMY_RULES: TaxonomyRule[] = [
  {
    roleFamily: "Founder/CEO",
    keywords: ["founder", "co-founder", "ceo", "chief executive"],
    department: "Executive",
    personaType: "ECONOMIC_BUYER"
  },
  {
    roleFamily: "CRO/Revenue",
    keywords: ["cro", "chief revenue", "chief sales", "revenue"],
    department: "Revenue",
    personaType: "ECONOMIC_BUYER"
  },
  {
    roleFamily: "VP Sales",
    keywords: ["vp sales", "vice president sales", "head of sales", "sales leader"],
    department: "Revenue",
    personaType: "ECONOMIC_BUYER"
  },
  {
    roleFamily: "RevOps/Sales Ops/GTM Systems",
    keywords: [
      "revops",
      "revenue operations",
      "sales ops",
      "sales operations",
      "gtm systems",
      "go-to-market systems"
    ],
    department: "Revenue Operations",
    personaType: "DAY_TO_DAY_OWNER"
  },
  {
    roleFamily: "Growth/Marketing",
    keywords: ["growth", "marketing", "demand gen", "demand generation"],
    department: "Growth",
    personaType: "INFLUENCER"
  },
  {
    roleFamily: "Platform/Infrastructure/DevOps/SRE",
    keywords: [
      "platform",
      "infrastructure",
      "infra",
      "devops",
      "sre",
      "site reliability",
      "developer productivity"
    ],
    department: "Platform",
    personaType: "TECHNICAL_BUYER"
  },
  {
    roleFamily: "Security/Compliance",
    keywords: ["security", "ciso", "compliance", "risk", "trust"],
    department: "Security",
    personaType: "TECHNICAL_BUYER"
  },
  {
    roleFamily: "Engineering",
    keywords: ["engineering", "engineer", "cto", "technology"],
    department: "Engineering",
    personaType: "TECHNICAL_BUYER"
  },
  {
    roleFamily: "Finance/CFO/Controller",
    keywords: [
      "cfo",
      "chief financial",
      "finance",
      "controller",
      "fp&a",
      "procurement"
    ],
    department: "Finance",
    personaType: "ECONOMIC_BUYER"
  },
  {
    roleFamily: "Product",
    keywords: ["product", "cpo", "product management"],
    department: "Product",
    personaType: "INFLUENCER"
  },
  {
    roleFamily: "Data/Analytics",
    keywords: ["data", "analytics", "bi ", "business intelligence"],
    department: "Data",
    personaType: "TECHNICAL_BUYER"
  },
  {
    roleFamily: "Operations",
    keywords: ["operations", "bizops", "business operations", "chief operating"],
    department: "Operations",
    personaType: "DAY_TO_DAY_OWNER"
  }
];

export function normalizeTitle(title: string): NormalizedTitle {
  const normalized = normalizeText(title);
  const rule =
    TAXONOMY_RULES.find((candidate) =>
      candidate.keywords.some((keyword) => normalized.includes(keyword))
    ) ?? null;
  const matchedKeywords =
    rule?.keywords.filter((keyword) => normalized.includes(keyword)) ?? [];
  const seniority = inferSeniority(normalized);

  return {
    title,
    seniority,
    department: rule?.department ?? "Unknown",
    personaType: refinePersonaType(rule?.personaType ?? "UNKNOWN", seniority),
    roleFamily: rule?.roleFamily ?? "Unknown",
    matchedKeywords
  };
}

export function scorePersonForMotion(input: PersonScoringInput): PersonScore {
  const normalized = normalizeTitle(input.title);
  const seniority = input.seniority ?? normalized.seniority;
  const department = input.department ?? normalized.department;
  const personaType = input.personaType ?? normalized.personaType;
  const motionKeywords = keywordsForMotion(input.motion);
  const text = normalizeText(
    [
      input.title,
      department,
      personaType,
      input.accountContext?.industry,
      input.accountContext?.websiteSummary,
      input.accountContext?.pricingSummary,
      input.accountContext?.careersSummary
    ]
      .filter(Boolean)
      .join(" ")
  );
  const roleMatch = scoreKeywordMatch(text, motionKeywords.roleKeywords, 45);
  const seniorityMatch = scoreSeniorityMatch(seniority, personaType);
  const departmentMatch = scoreKeywordMatch(
    normalizeText(department),
    motionKeywords.departmentKeywords,
    50
  );
  const recentSignalMatch = scoreRecentSignalMatch(
    input.recentSignals ?? [],
    motionKeywords.all
  );
  const accountContextMatch = scoreKeywordMatch(
    text,
    motionKeywords.accountKeywords,
    45
  );
  const contactabilityScore = clampScore(input.contactabilityScore ?? 45);
  const sourceConfidence = clampScore(
    (input.sourceConfidence ?? 0.55) <= 1
      ? (input.sourceConfidence ?? 0.55) * 100
      : input.sourceConfidence ?? 55
  );

  return {
    personScore: clampScore(
      Math.round(
        0.25 * roleMatch +
          0.2 * seniorityMatch +
          0.15 * departmentMatch +
          0.15 * recentSignalMatch +
          0.1 * accountContextMatch +
          0.1 * contactabilityScore +
          0.05 * sourceConfidence
      )
    ),
    roleMatch,
    seniorityMatch,
    departmentMatch,
    recentSignalMatch,
    accountContextMatch,
    contactabilityScore,
    sourceConfidence
  };
}

export function roleHintsForMotion(motion: string): string[] {
  return keywordsForMotion(motion).roleHints;
}

function refinePersonaType(
  personaType: PersonaType,
  seniority: TitleSeniority
): PersonaType {
  if (
    personaType === "INFLUENCER" &&
    ["Founder", "C-Level", "VP"].includes(seniority)
  ) {
    return "CHAMPION_CANDIDATE";
  }

  return personaType;
}

function inferSeniority(normalizedTitle: string): TitleSeniority {
  if (normalizedTitle.includes("founder")) {
    return "Founder";
  }

  if (
    normalizedTitle.includes("chief") ||
    /\bceo\b|\bcro\b|\bcto\b|\bcfo\b|\bciso\b|\bcpo\b/.test(normalizedTitle)
  ) {
    return "C-Level";
  }

  if (/\bvp\b|vice president/.test(normalizedTitle)) {
    return "VP";
  }

  if (normalizedTitle.includes("head of")) {
    return "Head";
  }

  if (normalizedTitle.includes("director")) {
    return "Director";
  }

  if (normalizedTitle.includes("manager") || normalizedTitle.includes("lead")) {
    return "Manager";
  }

  if (normalizedTitle.trim().length > 0) {
    return "Individual Contributor";
  }

  return "Unknown";
}

function scoreSeniorityMatch(
  seniority: TitleSeniority,
  personaType: PersonaType
): number {
  if (personaType === "ECONOMIC_BUYER") {
    return seniority === "Founder" || seniority === "C-Level"
      ? 100
      : seniority === "VP"
        ? 86
        : seniority === "Head"
          ? 72
          : 50;
  }

  if (personaType === "TECHNICAL_BUYER") {
    return ["C-Level", "VP", "Head", "Director"].includes(seniority) ? 90 : 68;
  }

  if (personaType === "DAY_TO_DAY_OWNER") {
    return ["VP", "Head", "Director", "Manager"].includes(seniority) ? 88 : 62;
  }

  return ["VP", "Head", "Director", "Manager"].includes(seniority) ? 74 : 55;
}

function scoreRecentSignalMatch(
  signals: NonNullable<PersonScoringInput["recentSignals"]>,
  keywords: string[]
): number {
  if (signals.length === 0) {
    return 45;
  }

  const best = signals.reduce((max, signal) => {
    const text = normalizeText(
      `${signal.type ?? ""} ${signal.title ?? ""} ${signal.description ?? ""}`
    );
    const matched = keywords.some((keyword) => text.includes(keyword));
    const signalScore = signal.totalScore ?? 55;

    return Math.max(max, matched ? Math.max(75, signalScore) : signalScore * 0.5);
  }, 0);

  return clampScore(Math.round(best));
}

function scoreKeywordMatch(
  text: string,
  keywords: string[],
  fallback: number
): number {
  const matches = keywords.filter((keyword) => text.includes(keyword)).length;

  if (matches === 0) {
    return fallback;
  }

  return clampScore(65 + matches * 10);
}

function keywordsForMotion(motion: string): {
  roleHints: string[];
  roleKeywords: string[];
  departmentKeywords: string[];
  accountKeywords: string[];
  all: string[];
} {
  const normalizedMotion = normalizeText(motion);

  if (
    normalizedMotion.includes("ai gtm") ||
    normalizedMotion.includes("gtm workflow") ||
    normalizedMotion.includes("sales")
  ) {
    const roleKeywords = [
      "revops",
      "revenue operations",
      "sales operations",
      "sales ops",
      "gtm systems",
      "growth",
      "marketing",
      "sdr",
      "account executive",
      "data",
      "ai"
    ];

    return {
      roleHints: [
        "RevOps",
        "Revenue Operations",
        "Sales Ops",
        "GTM Systems",
        "Growth",
        "Sales",
        "Data"
      ],
      roleKeywords,
      departmentKeywords: ["revenue", "revenue operations", "growth", "data"],
      accountKeywords: ["gtm", "sales", "revenue", "growth", "ai", "workflow"],
      all: roleKeywords
    };
  }

  if (
    normalizedMotion.includes("developer infrastructure") ||
    normalizedMotion.includes("devops") ||
    normalizedMotion.includes("platform")
  ) {
    const roleKeywords = [
      "engineering",
      "platform",
      "infrastructure",
      "infra",
      "devops",
      "sre",
      "security",
      "developer productivity"
    ];

    return {
      roleHints: [
        "Engineering",
        "Platform Engineering",
        "Infrastructure",
        "DevOps",
        "SRE",
        "Security"
      ],
      roleKeywords,
      departmentKeywords: ["engineering", "platform", "security"],
      accountKeywords: ["developer", "infrastructure", "platform", "cloud"],
      all: roleKeywords
    };
  }

  const roleKeywords = [
    "founder",
    "revenue",
    "operations",
    "engineering",
    "product",
    "finance",
    "data",
    "growth"
  ];

  return {
    roleHints: ["Founder", "CEO", "Revenue", "Operations", "Engineering"],
    roleKeywords,
    departmentKeywords: ["revenue", "operations", "engineering", "product"],
    accountKeywords: ["b2b", "saas", "enterprise", "workflow", "automation"],
    all: roleKeywords
  };
}

function normalizeText(value: string): string {
  return value.toLowerCase().replaceAll("/", " ");
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}
