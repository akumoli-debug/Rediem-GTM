import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MCPResearchProvider,
  MockProvider,
  ProviderError,
  ProviderRateLimitError,
  ProviderRegistry,
  ProviderTimeoutError
} from "../src/server/providers/index";

test("ProviderRegistry registers and retrieves providers by capability", async () => {
  const registry = new ProviderRegistry();
  const mockProvider = new MockProvider();

  registry
    .register("company", mockProvider)
    .register("people", mockProvider)
    .register("emailVerification", mockProvider);

  assert.equal(registry.has("company", mockProvider.name), true);
  assert.deepEqual(registry.list("people"), [mockProvider.name]);

  const companyProvider = registry.get("company", mockProvider.name);
  const company = await companyProvider.enrichCompany({
    domain: "example.com",
    companyName: "Example Co"
  });

  assert.equal(company.domain, "example.com");
  assert.equal(company.name, "Example Co");

  const peopleProvider = registry.get("people");
  const people = await peopleProvider.findPeople({
    domain: "example.com",
    maxResults: 1
  });

  assert.equal(people.length, 1);
  assert.equal(people[0]?.personaType, "DAY_TO_DAY_OWNER");
});

test("ProviderRegistry throws ProviderError for missing providers", () => {
  const registry = new ProviderRegistry();

  assert.throws(
    () => registry.get("company"),
    (error) =>
      error instanceof ProviderError &&
      error.code === "PROVIDER_NOT_REGISTERED" &&
      error.capability === "company"
  );
});

test("provider error subclasses preserve provider metadata", () => {
  const timeoutError = new ProviderTimeoutError("Provider timed out", {
    providerName: "sample",
    capability: "webResearch",
    retryAfterMs: 1000
  });

  assert.equal(timeoutError.name, "ProviderTimeoutError");
  assert.equal(timeoutError.code, "PROVIDER_TIMEOUT");
  assert.equal(timeoutError.providerName, "sample");
  assert.equal(timeoutError.capability, "webResearch");
  assert.equal(timeoutError.retryAfterMs, 1000);

  const rateLimitError = new ProviderRateLimitError("Provider rate limited", {
    providerName: "sample",
    capability: "people",
    statusCode: 429
  });

  assert.equal(rateLimitError.name, "ProviderRateLimitError");
  assert.equal(rateLimitError.code, "PROVIDER_RATE_LIMIT");
  assert.equal(rateLimitError.statusCode, 429);
});

test("MCPResearchProvider returns mock responses behind feature flag", async () => {
  const provider = new MCPResearchProvider({
    mockResponses: true
  });

  const result = await provider.searchWeb("account expansion signal", {
    maxResults: 1
  });

  assert.equal(result.length, 1);
  assert.equal(result[0]?.source, provider.name);
});

test("MCPResearchProvider fails cleanly when not configured", async () => {
  const provider = new MCPResearchProvider({
    command: undefined,
    mockResponses: false
  });

  await assert.rejects(
    () => provider.scrapePage("https://example.com"),
    (error) =>
      error instanceof ProviderError &&
      error.code === "PROVIDER_NOT_CONFIGURED" &&
      error.providerName === provider.name
  );
});
