export type BudgetControls = {
  maxCostPerAccount?: number;
  maxCostPerContact?: number;
  maxTotalRunCost?: number;
  stopRunOnBudgetExceeded?: boolean;
};

export type BudgetUsage = {
  totalCostUsd: number;
  accountCount?: number;
  verifiedContactCount?: number;
};

export type BudgetDecision = {
  allowed: boolean;
  reason: string;
  projectedTotalCostUsd: number;
};

export class BudgetExceededError extends Error {
  decision: BudgetDecision;

  constructor(decision: BudgetDecision) {
    super(decision.reason);
    this.name = "BudgetExceededError";
    this.decision = decision;
  }
}

export function evaluateBudgetForProviderCall(input: {
  controls?: BudgetControls;
  usage: BudgetUsage;
  estimatedCostUsd: number;
}): BudgetDecision {
  const controls = input.controls;
  const projectedTotalCostUsd = roundCurrency(
    input.usage.totalCostUsd + input.estimatedCostUsd
  );

  if (!controls || controls.stopRunOnBudgetExceeded === false) {
    return {
      allowed: true,
      projectedTotalCostUsd,
      reason: "Budget controls are not stopping provider calls."
    };
  }

  if (
    controls.maxTotalRunCost !== undefined &&
    projectedTotalCostUsd > controls.maxTotalRunCost
  ) {
    return {
      allowed: false,
      projectedTotalCostUsd,
      reason: `Projected run cost ${projectedTotalCostUsd} exceeds maxTotalRunCost ${controls.maxTotalRunCost}.`
    };
  }

  if (
    controls.maxCostPerAccount !== undefined &&
    input.usage.accountCount &&
    projectedTotalCostUsd / input.usage.accountCount > controls.maxCostPerAccount
  ) {
    return {
      allowed: false,
      projectedTotalCostUsd,
      reason: `Projected cost per account ${roundCurrency(
        projectedTotalCostUsd / input.usage.accountCount
      )} exceeds maxCostPerAccount ${controls.maxCostPerAccount}.`
    };
  }

  if (
    controls.maxCostPerContact !== undefined &&
    input.usage.verifiedContactCount &&
    projectedTotalCostUsd / input.usage.verifiedContactCount > controls.maxCostPerContact
  ) {
    return {
      allowed: false,
      projectedTotalCostUsd,
      reason: `Projected cost per verified contact ${roundCurrency(
        projectedTotalCostUsd / input.usage.verifiedContactCount
      )} exceeds maxCostPerContact ${controls.maxCostPerContact}.`
    };
  }

  return {
    allowed: true,
    projectedTotalCostUsd,
    reason: "Provider call is within budget controls."
  };
}

export function createBudgetGuard(controls?: BudgetControls, usage?: Partial<BudgetUsage>) {
  let totalCostUsd = usage?.totalCostUsd ?? 0;

  return {
    reserve(estimatedCostUsd: number) {
      const decision = evaluateBudgetForProviderCall({
        controls,
        usage: {
          totalCostUsd,
          accountCount: usage?.accountCount,
          verifiedContactCount: usage?.verifiedContactCount
        },
        estimatedCostUsd
      });

      if (!decision.allowed) {
        throw new BudgetExceededError(decision);
      }

      totalCostUsd = decision.projectedTotalCostUsd;
      return decision;
    },
    totalCostUsd() {
      return totalCostUsd;
    }
  };
}

function roundCurrency(value: number) {
  return Math.round(value * 10_000) / 10_000;
}

