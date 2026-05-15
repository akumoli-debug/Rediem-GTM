import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateFieldFillRates,
  calculateProviderHealth,
  calculateRunCostMetrics,
  createBudgetGuard,
  evaluateBudgetForProviderCall
} from "../src/server/observability";
import { runWaterfall } from "../src/server/workflows/waterfall";

test("run cost calculations include cache hit rate and unit costs", () => {
  const metrics = calculateRunCostMetrics({
    inputCount: 2,
    generatedAccountCount: 2,
    verifiedContactCount: 1,
    providerCalls: [
      {
        provider: "mock",
        toolName: "company",
        status: "SUCCESS",
        costUsd: 0.1,
        latencyMs: 100,
        createdAt: new Date()
      },
      {
        provider: "cache",
        toolName: "company.cache",
        status: "CACHED",
        costUsd: 0,
        latencyMs: 0,
        createdAt: new Date()
      }
    ]
  });

  assert.equal(metrics.totalCostUsd, 0.1);
  assert.equal(metrics.cacheHitRate, 50);
  assert.equal(metrics.costPerAccount, 0.05);
  assert.equal(metrics.costPerVerifiedContact, 0.1);
  assert.equal(metrics.averageLatencyMs, 50);
});

test("provider health includes missing keys, latency, success and failure dates", () => {
  const now = new Date("2026-05-14T12:00:00.000Z");
  const health = calculateProviderHealth({
    providerCalls: [
      {
        provider: "apify",
        toolName: "search",
        status: "SUCCESS",
        costUsd: 0.02,
        latencyMs: 200,
        createdAt: now
      },
      {
        provider: "apify",
        toolName: "search",
        status: "FAILED",
        costUsd: 0.02,
        latencyMs: 400,
        errorMessage: "Rate limited",
        createdAt: new Date("2026-05-14T12:05:00.000Z")
      }
    ],
    requiredKeysByProvider: { apify: ["APIFY_TOKEN"] },
    env: {},
    estimatedCostByProvider: { apify: 0.02 }
  });

  assert.equal(health[0].configured, false);
  assert.deepEqual(health[0].missingKeys, ["APIFY_TOKEN"]);
  assert.equal(health[0].successRate, 50);
  assert.equal(health[0].averageLatencyMs, 300);
  assert.equal(health[0].lastSuccessfulCall?.toISOString(), now.toISOString());
});

test("field fill rates count populated values", () => {
  const rates = calculateFieldFillRates(
    [
      { domain: "example.com", score: 10 },
      { domain: "", score: null },
      { domain: "linear.app", score: 86 }
    ],
    ["domain", "score"]
  );

  assert.deepEqual(rates, [
    { field: "domain", filled: 2, total: 3, rate: 67 },
    { field: "score", filled: 2, total: 3, rate: 67 }
  ]);
});

test("budget guard prevents projected run spend above maxTotalRunCost", () => {
  const decision = evaluateBudgetForProviderCall({
    controls: { maxTotalRunCost: 0.05, stopRunOnBudgetExceeded: true },
    usage: { totalCostUsd: 0.04 },
    estimatedCostUsd: 0.02
  });

  assert.equal(decision.allowed, false);
});

test("budget guard can reserve cost while under budget", () => {
  const guard = createBudgetGuard({
    maxTotalRunCost: 0.05,
    stopRunOnBudgetExceeded: true
  });

  guard.reserve(0.02);
  guard.reserve(0.03);

  assert.equal(guard.totalCostUsd(), 0.05);
});

test("waterfall budget stop condition prevents additional provider calls", async () => {
  const calls: string[] = [];
  const result = await runWaterfall({
    name: "budgeted_workflow",
    input: {},
    budgetControls: {
      maxTotalRunCost: 0.05,
      stopRunOnBudgetExceeded: true
    },
    steps: [
      {
        name: "cheap_step",
        estimatedCostUsd: 0.04,
        run: async () => {
          calls.push("cheap_step");
          return "cheap";
        }
      },
      {
        name: "expensive_step",
        estimatedCostUsd: 0.02,
        run: async () => {
          calls.push("expensive_step");
          return "expensive";
        }
      }
    ]
  });

  assert.deepEqual(calls, ["cheap_step"]);
  assert.equal(result.status, "COST_LIMITED");
});

