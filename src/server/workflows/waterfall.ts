import {
  evaluateBudgetForProviderCall,
  type BudgetControls
} from "@/server/observability/budget";
import { redactSensitiveValue } from "@/server/providers/redaction";

export type RunCondition<TInput, TOutput> = (
  context: WaterfallContext<TInput, TOutput>
) => boolean | Promise<boolean>;

export type StopCondition<TInput, TOutput> = (
  result: TOutput,
  context: WaterfallContext<TInput, TOutput>
) => boolean | Promise<boolean>;

export type WaterfallProviderHealth = {
  providerName: string;
  healthy: boolean;
  message?: string;
};

export type WaterfallProviderResultRecord = {
  workspaceId?: string;
  provider: string;
  toolName: string;
  inputHash: string;
  rawResponse?: unknown;
  normalizedResponse?: unknown;
  costUsd?: number | string | null;
  latencyMs?: number | null;
  status: "SUCCESS" | "PARTIAL" | "FAILED" | "CACHED";
  errorMessage?: string | null;
  createdAt?: Date;
};

export type WaterfallLogger = {
  info?(event: WaterfallLogEvent): void;
  warn?(event: WaterfallLogEvent): void;
  error?(event: WaterfallLogEvent): void;
};

export type WaterfallLogEvent = {
  workflowName: string;
  stepName?: string;
  event:
    | "cache_hit"
    | "step_skipped"
    | "step_started"
    | "step_succeeded"
    | "step_failed"
    | "step_stopped"
    | "step_unhealthy"
    | "max_cost_exceeded"
    | "waterfall_completed";
  attempt?: number;
  providerName?: string;
  costUsd?: number;
  message?: string;
  timestamp: Date;
};

export type WaterfallContext<TInput, TOutput> = {
  name: string;
  input: TInput;
  workspaceId?: string;
  maxCostUsd?: number;
  spentCostUsd: number;
  attempts: Record<string, number>;
  logs: WaterfallLogEvent[];
  lastResult?: TOutput;
  metadata: Record<string, unknown>;
};

export type WaterfallStep<TInput, TOutput> = {
  name: string;
  providerName?: string;
  estimatedCostUsd?: number;
  maxAttempts?: number;
  backoffMs?: number;
  condition?: RunCondition<TInput, TOutput>;
  healthCheck?: (
    context: WaterfallContext<TInput, TOutput>
  ) => Promise<WaterfallProviderHealth> | WaterfallProviderHealth;
  run: (context: WaterfallContext<TInput, TOutput>) => Promise<TOutput>;
  stopIf?: StopCondition<TInput, TOutput>;
};

export type WaterfallResult<TOutput> = {
  name: string;
  status: "COMPLETED" | "STOPPED" | "CACHE_HIT" | "FAILED" | "COST_LIMITED";
  result?: TOutput;
  stoppedAtStep?: string;
  spentCostUsd: number;
  attempts: Record<string, number>;
  logs: WaterfallLogEvent[];
  errors: Array<{
    stepName: string;
    message: string;
  }>;
  fromCache: boolean;
};

export type RunWaterfallInput<TInput, TOutput> = {
  name: string;
  input: TInput;
  workspaceId?: string;
  maxCostUsd?: number;
  budgetControls?: BudgetControls;
  budgetUsage?: {
    accountCount?: number;
    verifiedContactCount?: number;
  };
  maxAttempts?: number;
  steps: Array<WaterfallStep<TInput, TOutput>>;
  cache?: {
    key: string;
    get(): Promise<TOutput | null> | TOutput | null;
    set?(result: TOutput): Promise<void> | void;
  };
  logger?: WaterfallLogger;
  persistProviderResult?: (
    result: WaterfallProviderResultRecord
  ) => Promise<void> | void;
  metadata?: Record<string, unknown>;
};

export async function runWaterfall<TInput, TOutput>(
  input: RunWaterfallInput<TInput, TOutput>
): Promise<WaterfallResult<TOutput>> {
  const context: WaterfallContext<TInput, TOutput> = {
    name: input.name,
    input: input.input,
    workspaceId: input.workspaceId,
    maxCostUsd: input.maxCostUsd,
    spentCostUsd: 0,
    attempts: {},
    logs: [],
    metadata: input.metadata ?? {}
  };
  const errors: WaterfallResult<TOutput>["errors"] = [];

  if (input.cache) {
    const cached = await input.cache.get();

    if (cached) {
      await persist(input, {
        workspaceId: input.workspaceId,
        provider: "cache",
        toolName: `${input.name}.cache`,
        inputHash: input.cache.key,
        normalizedResponse: cached,
        costUsd: 0,
        latencyMs: 0,
        status: "CACHED"
      });
      log(input, context, {
        event: "cache_hit",
        message: `Cache hit for ${input.cache.key}`
      });

      return {
        name: input.name,
        status: "CACHE_HIT",
        result: cached,
        spentCostUsd: 0,
        attempts: context.attempts,
        logs: context.logs,
        errors,
        fromCache: true
      };
    }
  }

  for (const step of input.steps) {
    const shouldRun = step.condition ? await step.condition(context) : true;

    if (!shouldRun) {
      log(input, context, {
        stepName: step.name,
        event: "step_skipped",
        providerName: step.providerName
      });
      continue;
    }

    const estimatedCostUsd = step.estimatedCostUsd ?? 0;

    const budgetDecision = evaluateBudgetForProviderCall({
      controls:
        input.budgetControls ??
        (input.maxCostUsd === undefined
          ? undefined
          : {
              maxTotalRunCost: input.maxCostUsd,
              stopRunOnBudgetExceeded: true
            }),
      usage: {
        totalCostUsd: context.spentCostUsd,
        accountCount: input.budgetUsage?.accountCount,
        verifiedContactCount: input.budgetUsage?.verifiedContactCount
      },
      estimatedCostUsd
    });

    if (!budgetDecision.allowed) {
      log(input, context, {
        stepName: step.name,
        event: "max_cost_exceeded",
        providerName: step.providerName,
        costUsd: estimatedCostUsd,
        message: budgetDecision.reason
      });

      return {
        name: input.name,
        status: "COST_LIMITED",
        result: context.lastResult,
        spentCostUsd: context.spentCostUsd,
        attempts: context.attempts,
        logs: context.logs,
        errors,
        fromCache: false
      };
    }

    if (step.healthCheck) {
      const health = await step.healthCheck(context);

      if (!health.healthy) {
        log(input, context, {
          stepName: step.name,
          event: "step_unhealthy",
          providerName: health.providerName,
          message: health.message
        });
        continue;
      }
    }

    const maxAttempts = step.maxAttempts ?? input.maxAttempts ?? 1;
    let stepSucceeded = false;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      context.attempts[step.name] = attempt;
      const startedAt = Date.now();
      log(input, context, {
        stepName: step.name,
        event: "step_started",
        attempt,
        providerName: step.providerName,
        costUsd: estimatedCostUsd
      });

      try {
        const result = await step.run(context);
        const latencyMs = Date.now() - startedAt;
        context.spentCostUsd = roundCost(
          context.spentCostUsd + estimatedCostUsd
        );
        context.lastResult = result;
        stepSucceeded = true;
        await persist(input, {
          workspaceId: input.workspaceId,
          provider: step.providerName ?? step.name,
          toolName: step.name,
          inputHash: stableHash({
            workflow: input.name,
            step: step.name,
            input: input.input
          }),
          rawResponse: result,
          normalizedResponse: result,
          costUsd: estimatedCostUsd,
          latencyMs,
          status: "SUCCESS"
        });
        log(input, context, {
          stepName: step.name,
          event: "step_succeeded",
          attempt,
          providerName: step.providerName,
          costUsd: estimatedCostUsd
        });

        if (step.stopIf && (await step.stopIf(result, context))) {
          await input.cache?.set?.(result);
          log(input, context, {
            stepName: step.name,
            event: "step_stopped",
            providerName: step.providerName
          });

          return {
            name: input.name,
            status: "STOPPED",
            result,
            stoppedAtStep: step.name,
            spentCostUsd: context.spentCostUsd,
            attempts: context.attempts,
            logs: context.logs,
            errors,
            fromCache: false
          };
        }

        break;
      } catch (error) {
        const latencyMs = Date.now() - startedAt;
        const message = error instanceof Error ? error.message : String(error);
        errors.push({
          stepName: step.name,
          message
        });
        await persist(input, {
          workspaceId: input.workspaceId,
          provider: step.providerName ?? step.name,
          toolName: step.name,
          inputHash: stableHash({
            workflow: input.name,
            step: step.name,
            input: input.input,
            attempt
          }),
          costUsd: estimatedCostUsd,
          latencyMs,
          status: "FAILED",
          errorMessage: message
        });
        log(input, context, {
          stepName: step.name,
          event: "step_failed",
          attempt,
          providerName: step.providerName,
          message
        });

        if (attempt < maxAttempts) {
          await delay((step.backoffMs ?? 0) * attempt);
        }
      }
    }

    if (!stepSucceeded) {
      continue;
    }
  }

  if (context.lastResult) {
    await input.cache?.set?.(context.lastResult);
  }

  log(input, context, {
    event: "waterfall_completed"
  });

  return {
    name: input.name,
    status: context.lastResult ? "COMPLETED" : "FAILED",
    result: context.lastResult,
    spentCostUsd: context.spentCostUsd,
    attempts: context.attempts,
    logs: context.logs,
    errors,
    fromCache: false
  };
}

function log<TInput, TOutput>(
  input: RunWaterfallInput<TInput, TOutput>,
  context: WaterfallContext<TInput, TOutput>,
  event: Omit<WaterfallLogEvent, "workflowName" | "timestamp">
): void {
  const logEvent: WaterfallLogEvent = {
    workflowName: input.name,
    timestamp: new Date(),
    ...event
  };
  context.logs.push(logEvent);

  if (event.event === "step_failed" || event.event === "max_cost_exceeded") {
    input.logger?.error?.(logEvent);
  } else if (event.event === "step_unhealthy") {
    input.logger?.warn?.(logEvent);
  } else {
    input.logger?.info?.(logEvent);
  }
}

async function persist<TInput, TOutput>(
  input: RunWaterfallInput<TInput, TOutput>,
  result: WaterfallProviderResultRecord
): Promise<void> {
  await input.persistProviderResult?.({
    ...result,
    rawResponse: toJsonCompatible(redactSensitiveValue(result.rawResponse)),
    normalizedResponse: toJsonCompatible(redactSensitiveValue(result.normalizedResponse))
  });
}

function stableHash(value: unknown): string {
  const json = JSON.stringify(sortJsonValue(value));
  let hash = 0;

  for (let index = 0; index < json.length; index += 1) {
    hash = (hash * 31 + json.charCodeAt(index)) >>> 0;
  }

  return hash.toString(16);
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue);
  }

  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortJsonValue(child)])
    );
  }

  return value;
}

function toJsonCompatible(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value)) as unknown;
}

function roundCost(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

async function delay(ms: number): Promise<void> {
  if (ms <= 0) {
    return;
  }

  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
