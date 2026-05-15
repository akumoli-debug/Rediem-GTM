export type SignalType =
  | "FUNDING"
  | "HIRING"
  | "PRODUCT_LAUNCH"
  | "PRICING_CHANGE"
  | "TECH_STACK"
  | "COMPLIANCE"
  | "EXPANSION"
  | "NEWS"
  | "FOUNDER_POST"
  | "OTHER";

export type SignalSourceCategory =
  | "COMPANY_WEBSITE"
  | "COMPANY_CAREERS"
  | "COMPANY_PRESS"
  | "REPUTABLE_NEWS"
  | "LINKEDIN_OR_SOCIAL"
  | "GENERIC_WEB"
  | "UNKNOWN";

export type SignalScoringInput = {
  type: SignalType;
  title: string;
  description?: string;
  signalDate?: Date;
  sourceUrl?: string;
  sourceCategory?: SignalSourceCategory;
};

export type ScoredSignal = SignalScoringInput & {
  relevanceScore: number;
  freshnessScore: number;
  sourceQualityScore: number;
  totalScore: number;
};

export type AccountScoreInput = {
  signals: Array<Pick<ScoredSignal, "totalScore" | "type">>;
  companyFitScore: number;
  evidenceConfidence: number;
};

export function scoreSignal(
  input: SignalScoringInput,
  options: {
    focus?: string;
    now?: Date;
  } = {}
): ScoredSignal {
  const freshnessScore = calculateFreshnessScore(
    input.signalDate,
    options.now ?? new Date()
  );
  const sourceQualityScore = calculateSourceQualityScore(
    input.sourceCategory ?? inferSourceCategory(input.sourceUrl)
  );
  const relevanceScore = calculateRelevanceScore(input, options.focus);
  const totalScore = clampScore(
    Math.round(
      relevanceScore * 0.5 + freshnessScore * 0.25 + sourceQualityScore * 0.25
    )
  );

  return {
    ...input,
    freshnessScore,
    sourceQualityScore,
    relevanceScore,
    totalScore
  };
}

export function calculateFreshnessScore(
  signalDate: Date | undefined,
  now = new Date()
): number {
  if (!signalDate) {
    return 40;
  }

  const ageDays = Math.max(
    0,
    Math.floor((now.getTime() - signalDate.getTime()) / 86_400_000)
  );

  if (ageDays <= 14) {
    return 100;
  }

  if (ageDays <= 45) {
    return 75;
  }

  if (ageDays <= 90) {
    return 50;
  }

  if (ageDays <= 180) {
    return 25;
  }

  return 10;
}

export function calculateSourceQualityScore(
  sourceCategory: SignalSourceCategory
): number {
  switch (sourceCategory) {
    case "COMPANY_WEBSITE":
    case "COMPANY_CAREERS":
    case "COMPANY_PRESS":
      return 95;
    case "REPUTABLE_NEWS":
      return 85;
    case "LINKEDIN_OR_SOCIAL":
      return 75;
    case "GENERIC_WEB":
      return 60;
    case "UNKNOWN":
      return 40;
  }
}

export function calculateRelevanceScore(
  signal: Pick<SignalScoringInput, "type" | "title" | "description">,
  focus?: string
): number {
  const text = `${signal.title} ${signal.description ?? ""}`.toLowerCase();
  const model = selectRelevanceModel(focus);
  const typeBaseScore = model.typeWeights[signal.type] ?? model.typeWeights.OTHER;
  const keywordBoost = Math.min(
    25,
    model.keywords.reduce(
      (score, keyword) => score + (text.includes(keyword) ? 8 : 0),
      0
    )
  );

  return clampScore(typeBaseScore + keywordBoost);
}

export function calculateAccountScore(input: AccountScoreInput): number {
  const sortedScores = input.signals
    .map((signal) => signal.totalScore)
    .sort((left, right) => right - left);
  const maxSignalScore = sortedScores[0] ?? 0;
  const averageTop3SignalScore =
    sortedScores.length > 0
      ? average(sortedScores.slice(0, 3))
      : 0;
  const hiringMomentumScore = calculateHiringMomentumScore(input.signals);

  return clampScore(
    Math.round(
      0.35 * maxSignalScore +
        0.25 * averageTop3SignalScore +
        0.15 * input.companyFitScore +
        0.15 * hiringMomentumScore +
        0.1 * input.evidenceConfidence
    )
  );
}

export function inferSourceCategory(
  sourceUrl: string | undefined
): SignalSourceCategory {
  if (!sourceUrl) {
    return "UNKNOWN";
  }

  let url: URL;

  try {
    url = new URL(sourceUrl);
  } catch {
    return "UNKNOWN";
  }

  const host = url.hostname.toLowerCase();
  const path = url.pathname.toLowerCase();

  if (host.includes("linkedin.com") || host.includes("x.com")) {
    return "LINKEDIN_OR_SOCIAL";
  }

  if (isReputableNewsHost(host)) {
    return "REPUTABLE_NEWS";
  }

  if (path.includes("career") || path.includes("jobs")) {
    return "COMPANY_CAREERS";
  }

  if (path.includes("press") || path.includes("news")) {
    return "COMPANY_PRESS";
  }

  if (path === "/" || path.includes("about") || path.includes("pricing")) {
    return "COMPANY_WEBSITE";
  }

  return "GENERIC_WEB";
}

function calculateHiringMomentumScore(
  signals: Array<Pick<ScoredSignal, "totalScore" | "type">>
): number {
  const hiringSignals = signals.filter((signal) => signal.type === "HIRING");

  if (hiringSignals.length === 0) {
    return 35;
  }

  return clampScore(
    Math.round(
      average(hiringSignals.map((signal) => signal.totalScore)) +
        Math.min(20, hiringSignals.length * 5)
    )
  );
}

type RelevanceModel = {
  keywords: string[];
  typeWeights: Record<SignalType, number>;
};

function selectRelevanceModel(focus?: string): RelevanceModel {
  const normalizedFocus = focus?.toLowerCase() ?? "";

  if (
    normalizedFocus.includes("ai gtm") ||
    normalizedFocus.includes("gtm workflow") ||
    normalizedFocus.includes("sales")
  ) {
    return {
      keywords: [
        "revops",
        "revenue operations",
        "sales ops",
        "gtm systems",
        "sdr",
        "ae",
        "account executive",
        "growth",
        "data",
        "ai"
      ],
      typeWeights: {
        FUNDING: 82,
        HIRING: 88,
        PRODUCT_LAUNCH: 76,
        PRICING_CHANGE: 82,
        TECH_STACK: 72,
        COMPLIANCE: 68,
        EXPANSION: 84,
        NEWS: 62,
        FOUNDER_POST: 70,
        OTHER: 50
      }
    };
  }

  if (
    normalizedFocus.includes("developer infrastructure") ||
    normalizedFocus.includes("devops") ||
    normalizedFocus.includes("platform")
  ) {
    return {
      keywords: [
        "platform engineering",
        "infra",
        "infrastructure",
        "devops",
        "sre",
        "security",
        "developer productivity",
        "cloud",
        "kubernetes",
        "ci/cd"
      ],
      typeWeights: {
        FUNDING: 76,
        HIRING: 88,
        PRODUCT_LAUNCH: 80,
        PRICING_CHANGE: 64,
        TECH_STACK: 90,
        COMPLIANCE: 82,
        EXPANSION: 72,
        NEWS: 60,
        FOUNDER_POST: 66,
        OTHER: 50
      }
    };
  }

  return {
    keywords: [
      "revenue",
      "growth",
      "operations",
      "security",
      "compliance",
      "expansion",
      "enterprise",
      "automation",
      "data",
      "platform"
    ],
    typeWeights: {
      FUNDING: 82,
      HIRING: 80,
      PRODUCT_LAUNCH: 78,
      PRICING_CHANGE: 72,
      TECH_STACK: 72,
      COMPLIANCE: 74,
      EXPANSION: 82,
      NEWS: 62,
      FOUNDER_POST: 66,
      OTHER: 50
    }
  };
}

function isReputableNewsHost(host: string): boolean {
  return [
    "bloomberg.com",
    "reuters.com",
    "wsj.com",
    "forbes.com",
    "techcrunch.com",
    "businesswire.com",
    "prnewswire.com"
  ].some((newsHost) => host === newsHost || host.endsWith(`.${newsHost}`));
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}
