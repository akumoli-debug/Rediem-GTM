import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";

test("README uses clean Rediem GTM positioning", async () => {
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");

  assert.match(readme, /Rediem GTM Intelligence/);
  assert.match(readme, /community-driven loyalty/);
  assert.doesNotMatch(readme, /Clay/i);
});

test("environment example includes provider and CRM configuration", async () => {
  const envExample = await readFile(
    new URL("../.env.example", import.meta.url),
    "utf8"
  );

  for (const key of [
    "DATABASE_URL=",
    "REDIS_URL=",
    "MCP_RESEARCH_SERVER_COMMAND=",
    "OPENAI_API_KEY=",
    "HUBSPOT_ACCESS_TOKEN=",
    "SALESFORCE_REFRESH_TOKEN="
  ]) {
    assert.match(envExample, new RegExp(`^${key}`, "m"));
  }
});
