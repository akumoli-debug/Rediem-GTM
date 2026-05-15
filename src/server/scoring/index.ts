export type ScoreSignal = {
  name: string;
  weight: number;
  value: number;
};

export type ScoreResult = {
  score: number;
  reasons: string[];
};

export function calculateSignalScore(signals: ScoreSignal[]): ScoreResult {
  const totalWeight = signals.reduce((sum, signal) => sum + signal.weight, 0);

  if (totalWeight === 0) {
    return {
      score: 0,
      reasons: []
    };
  }

  const weightedScore =
    signals.reduce(
      (sum, signal) => sum + signal.value * signal.weight,
      0
    ) / totalWeight;

  return {
    score: Math.round(weightedScore),
    reasons: signals.map((signal) => signal.name)
  };
}

export * from "./signals";
export * from "./rediem";
export * from "./rediemTitleTaxonomy";
export * from "./communityFlywheel";
export * from "./communityArchetypes";
