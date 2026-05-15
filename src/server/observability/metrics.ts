import type { BudgetControls } from "./budget";

export type ProviderCallMetric = {
  provider: string;
  toolName: string;
  status: "SUCCESS" | "PARTIAL" | "FAILED" | "CACHED";
  costUsd: number;
  latencyMs: number | null;
  errorMessage?: string | null;
  createdAt: Date;
};

export type RunCostMetrics = {
  totalCostUsd: number;
  providerCallCount: number;
  cacheHitCount: number;
  cacheHitRate: number;
  successCount: number;
  failureCount: number;
  averageLatencyMs: number | null;
  costPerAccount: number | null;
  costPerVerifiedContact: number | null;
};

export type ProviderHealthMetric = {
  provider: string;
  configured: boolean;
  missingKeys: string[];
  lastSuccessfulCall: Date | null;
  lastFailure: Date | null;
  averageLatencyMs: number | null;
  successRate: number;
  estimatedCostUsd: number;
  calls: number;
};

export function calculateRunCostMetrics(input: {
  providerCalls: ProviderCallMetric[];
  inputCount: number;
  generatedAccountCount?: number;
  verifiedContactCount?: number;
}): RunCostMetrics {
  const totalCostUsd = roundMoney(
    input.providerCalls.reduce((sum, call) => sum + call.costUsd, 0)
  );
  const cacheHitCount = input.providerCalls.filter((call) => call.status === "CACHED").length;
  const successCount = input.providerCalls.filter((call) => call.status === "SUCCESS").length;
  const failureCount = input.providerCalls.filter((call) => call.status === "FAILED").length;
  const latencySamples = input.providerCalls.flatMap((call) =>
    call.latencyMs === null ? [] : [call.latencyMs]
  );
  const accountCount = input.generatedAccountCount ?? input.inputCount;
  const verifiedContactCount = input.verifiedContactCount ?? 0;

  return {
    totalCostUsd,
    providerCallCount: input.providerCalls.length,
    cacheHitCount,
    cacheHitRate:
      input.providerCalls.length === 0
        ? 0
        : Math.round((cacheHitCount / input.providerCalls.length) * 100),
    successCount,
    failureCount,
    averageLatencyMs:
      latencySamples.length === 0
        ? null
        : Math.round(
            latencySamples.reduce((sum, latency) => sum + latency, 0) /
              latencySamples.length
          ),
    costPerAccount:
      accountCount > 0 ? roundMoney(totalCostUsd / accountCount) : null,
    costPerVerifiedContact:
      verifiedContactCount > 0 ? roundMoney(totalCostUsd / verifiedContactCount) : null
  };
}

export function groupErrorsByProviderTool(providerCalls: ProviderCallMetric[]) {
  const grouped = new Map<
    string,
    { provider: string; toolName: string; count: number; latestError: string }
  >();

  for (const call of providerCalls) {
    if (call.status !== "FAILED" && !call.errorMessage) {
      continue;
    }

    const key = `${call.provider}:${call.toolName}`;
    const existing = grouped.get(key);
    grouped.set(key, {
      provider: call.provider,
      toolName: call.toolName,
      count: (existing?.count ?? 0) + 1,
      latestError: call.errorMessage ?? "Unknown provider error."
    });
  }

  return Array.from(grouped.values()).sort((left, right) => right.count - left.count);
}

export function calculateFieldFillRates<T extends Record<string, unknown>>(
  rows: T[],
  fields: Array<keyof T>
) {
  return fields.map((field) => {
    const filled = rows.filter((row) => isFilled(row[field])).length;

    return {
      field: String(field),
      filled,
      total: rows.length,
      rate: rows.length === 0 ? 0 : Math.round((filled / rows.length) * 100)
    };
  });
}

export function calculateProviderHealth(input: {
  providerCalls: ProviderCallMetric[];
  requiredKeysByProvider: Record<string, string[]>;
  env: Record<string, string | undefined>;
  estimatedCostByProvider?: Record<string, number>;
}): ProviderHealthMetric[] {
  const providerNames = Array.from(
    new Set([
      ...input.providerCalls.map((call) => call.provider),
      ...Object.keys(input.requiredKeysByProvider)
    ])
  ).sort();

  return providerNames.map((provider) => {
    const calls = input.providerCalls.filter((call) => call.provider === provider);
    const successes = calls.filter((call) => call.status === "SUCCESS");
    const failures = calls.filter((call) => call.status === "FAILED");
    const latencySamples = calls.flatMap((call) =>
      call.latencyMs === null ? [] : [call.latencyMs]
    );
    const requiredKeys = input.requiredKeysByProvider[provider] ?? [];
    const missingKeys = requiredKeys.filter((key) => !input.env[key]);

    return {
      provider,
      configured: missingKeys.length === 0,
      missingKeys,
      lastSuccessfulCall: latestDate(successes.map((call) => call.createdAt)),
      lastFailure: latestDate(failures.map((call) => call.createdAt)),
      averageLatencyMs:
        latencySamples.length === 0
          ? null
          : Math.round(
              latencySamples.reduce((sum, latency) => sum + latency, 0) /
                latencySamples.length
            ),
      successRate:
        calls.length === 0 ? 0 : Math.round((successes.length / calls.length) * 100),
      estimatedCostUsd: input.estimatedCostByProvider?.[provider] ?? 0,
      calls: calls.length
    };
  });
}

export const defaultBudgetControls: Required<BudgetControls> = {
  maxCostPerAccount: 0.5,
  maxCostPerContact: 0.15,
  maxTotalRunCost: 25,
  stopRunOnBudgetExceeded: true
};

function latestDate(dates: Date[]) {
  if (dates.length === 0) {
    return null;
  }

  return new Date(Math.max(...dates.map((date) => date.getTime())));
}

function isFilled(value: unknown) {
  return value !== null && value !== undefined && value !== "";
}

function roundMoney(value: number) {
  return Math.round(value * 10_000) / 10_000;
}

