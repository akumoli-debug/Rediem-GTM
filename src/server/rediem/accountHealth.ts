export const DEFAULT_REDIEM_STALE_AFTER_DAYS = 30;
export const DEFAULT_REDIEM_AGING_AFTER_DAYS = 21;
export const REDIEM_LOW_CONFIDENCE_THRESHOLD = 0.55;
export const REDIEM_HIGH_CONFIDENCE_THRESHOLD = 0.65;

export type RediemFreshnessStatus = "Fresh" | "Aging" | "Stale";
export type RediemConfidenceLabel =
  | "High confidence"
  | "Medium confidence"
  | "Low confidence / review required";
export type RediemReadiness = "OUTBOUND_READY" | "MANUAL_REVIEW";

export type RediemAnalysisFreshness = {
  status: RediemFreshnessStatus;
  ageDays: number | null;
  staleAfterDays: number;
  capturedAt: string | null;
  isStale: boolean;
};

export type RediemConfidenceSummary = {
  score: number | null;
  label: RediemConfidenceLabel;
  isLowConfidence: boolean;
};

export type RediemOutboundReadiness = {
  status: RediemReadiness;
  reasons: string[];
};

export function classifyAnalysisFreshness(
  capturedAt: Date | string | null | undefined,
  options: {
    now?: Date;
    staleAfterDays?: number;
    agingAfterDays?: number;
  } = {}
): RediemAnalysisFreshness {
  const staleAfterDays = options.staleAfterDays ?? DEFAULT_REDIEM_STALE_AFTER_DAYS;
  const agingAfterDays =
    options.agingAfterDays ?? Math.min(DEFAULT_REDIEM_AGING_AFTER_DAYS, staleAfterDays);
  const capturedDate = parseDate(capturedAt);

  if (!capturedDate) {
    return {
      status: "Stale",
      ageDays: null,
      staleAfterDays,
      capturedAt: null,
      isStale: true
    };
  }

  const now = options.now ?? new Date();
  const ageDays = Math.max(
    0,
    Math.floor((now.getTime() - capturedDate.getTime()) / (24 * 60 * 60 * 1000))
  );
  const status =
    ageDays > staleAfterDays ? "Stale" : ageDays >= agingAfterDays ? "Aging" : "Fresh";

  return {
    status,
    ageDays,
    staleAfterDays,
    capturedAt: capturedDate.toISOString(),
    isStale: status === "Stale"
  };
}

export function classifyConfidence(
  confidence: number | null | undefined
): RediemConfidenceSummary {
  const score = normalizeConfidence(confidence);

  if (score === null) {
    return {
      score: null,
      label: "Low confidence / review required",
      isLowConfidence: true
    };
  }

  if (score >= REDIEM_HIGH_CONFIDENCE_THRESHOLD) {
    return {
      score,
      label: "High confidence",
      isLowConfidence: false
    };
  }

  if (score >= REDIEM_LOW_CONFIDENCE_THRESHOLD) {
    return {
      score,
      label: "Medium confidence",
      isLowConfidence: false
    };
  }

  return {
    score,
    label: "Low confidence / review required",
    isLowConfidence: true
  };
}

export function deriveAccountConfidence(
  values: Array<number | null | undefined>
): RediemConfidenceSummary {
  const normalized = values
    .map(normalizeConfidence)
    .filter((value): value is number => value !== null);

  if (normalized.length === 0) {
    return classifyConfidence(null);
  }

  const average =
    normalized.reduce((sum, value) => sum + value, 0) / normalized.length;
  return classifyConfidence(average);
}

export function classifyOutboundReadiness(input: {
  baseReadiness?: RediemReadiness;
  freshness: RediemAnalysisFreshness;
  confidence: RediemConfidenceSummary | number | null | undefined;
}): RediemOutboundReadiness {
  const confidence =
    typeof input.confidence === "object" && input.confidence !== null
      ? input.confidence
      : classifyConfidence(input.confidence);
  const reasons: string[] = [];

  if (input.freshness.isStale) {
    reasons.push(
      `Analysis is stale; re-run Rediem analysis before outbound.`
    );
  }

  if (confidence.isLowConfidence) {
    reasons.push(`${confidence.label}; route to manual review.`);
  }

  if (input.baseReadiness === "MANUAL_REVIEW") {
    reasons.push("Playbook selection requires manual review.");
  }

  return {
    status: reasons.length > 0 ? "MANUAL_REVIEW" : input.baseReadiness ?? "OUTBOUND_READY",
    reasons
  };
}

function parseDate(value: Date | string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeConfidence(value: number | null | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  const normalized = value > 1 ? value / 100 : value;
  return Math.round(Math.max(0, Math.min(1, normalized)) * 100) / 100;
}
