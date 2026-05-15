import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import type { StructuredExtractResult } from "../src/server/providers";
import {
  blogPageSchema,
  careersPageSchema,
  companyProfileSchema,
  normalizeBlogPageExtract,
  normalizeCareersPageExtract,
  normalizeCompanyProfileExtract,
  normalizePressPageExtract,
  normalizePricingPageExtract,
  pressPageSchema,
  pricingPageSchema,
  websiteRootSchema
} from "../src/server/workflows/schemas";

test("schemas expose stable names and object schemas", () => {
  assert.equal(companyProfileSchema.name, "companyProfile");
  assert.equal(pricingPageSchema.name, "pricingPage");
  assert.equal(careersPageSchema.name, "careersPage");
  assert.equal(blogPageSchema.name, "blogPage");
  assert.equal(pressPageSchema.name, "pressPage");
  assert.equal(websiteRootSchema.name, "websiteRoot");
  assert.equal((companyProfileSchema.schema as { type: string }).type, "object");
});

test("company profile normalization attaches metadata and preserves visible fields", async () => {
  const html = await fixture("company-profile.html");
  const result = structuredResult({
    url: "https://northstar.example/about",
    data: {
      companyName: "Northstar Robotics",
      oneLiner: textBetween(html, "<p>", "</p>"),
      targetCustomers: ["mid-market manufacturers"],
      productCategories: ["robotics automation"],
      mainPainPoints: ["production uptime"],
      integrations: ["Salesforce", "Snowflake"],
      complianceMentions: ["SOC 2"],
      securityMentions: ["SSO", "audit logs"],
      enterpriseMotion: true,
      sourceConfidence: 0.86
    }
  });

  const normalized = normalizeCompanyProfileExtract(result, "fixture-provider");

  assert.equal(normalized.sourceUrl, "https://northstar.example/about");
  assert.equal(normalized.provider, "fixture-provider");
  assert.equal(normalized.companyName, "Northstar Robotics");
  assert.equal(normalized.enterpriseMotion, true);
  assert.deepEqual(normalized.integrations, ["Salesforce", "Snowflake"]);
});

test("pricing normalization uses null and empty arrays for unknown fields", async () => {
  await fixture("pricing-page.html");
  const result = structuredResult({
    url: "https://northstar.example/pricing",
    data: {
      plans: [
        { name: "Free", price: "$0", description: "Starter plan" },
        { name: "Enterprise", price: null, description: "Contact sales" }
      ],
      hasFreePlan: true,
      hasEnterprisePlan: true,
      pricingModel: "seat-based and usage-based",
      usageBased: true,
      salesLed: true,
      selfServe: true,
      sourceConfidence: 0.8
    }
  });

  const normalized = normalizePricingPageExtract(result, "fixture-provider");

  assert.equal(normalized.buyerSegment, null);
  assert.equal(normalized.plans.length, 2);
  assert.equal(normalized.plans[1]?.price, null);
});

test("careers normalization extracts hiring signals from fixture-shaped output", async () => {
  await fixture("careers-page.html");
  const normalized = normalizeCareersPageExtract(
    structuredResult({
      url: "https://northstar.example/careers",
      data: {
        openRoles: ["VP Revenue Operations", "Senior Security Engineer"],
        departmentsHiring: ["Revenue Operations", "Security"],
        seniorityHiring: ["VP", "Senior"],
        locations: ["Remote", "Austin"],
        remoteFriendly: true,
        hiringThemes: ["GTM systems", "security readiness"],
        growthSignal: "Hiring senior revenue and security roles",
        sourceConfidence: 0.79
      }
    }),
    "fixture-provider"
  );

  assert.deepEqual(normalized.departmentsHiring, ["Revenue Operations", "Security"]);
  assert.equal(normalized.remoteFriendly, true);
});

test("blog and press normalization keep empty arrays for invisible fields", async () => {
  await fixture("blog-page.html");
  await fixture("press-page.html");
  const blog = normalizeBlogPageExtract(
    structuredResult({
      url: "https://northstar.example/blog",
      data: {
        recentTopics: ["warehouse analytics"],
        productThemes: ["robotics telemetry"],
        customerStories: ["Acme Manufacturing"]
      }
    }),
    "fixture-provider"
  );
  const press = normalizePressPageExtract(
    structuredResult({
      url: "https://northstar.example/press",
      data: {
        recentAnnouncements: ["Northstar expands into Europe"],
        partnerships: ["Atlas Cloud"],
        executiveHires: ["New CFO"]
      }
    }),
    "fixture-provider"
  );

  assert.deepEqual(blog.launchMentions, []);
  assert.deepEqual(press.fundingMentions, []);
  assert.deepEqual(press.expansionMentions, []);
});

async function fixture(name: string) {
  return readFile(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
}

function structuredResult(input: {
  url: string;
  data: Record<string, unknown>;
}): StructuredExtractResult {
  return {
    url: input.url,
    schema: {},
    data: input.data,
    confidence: 0.7
  };
}

function textBetween(value: string, start: string, end: string) {
  const startIndex = value.indexOf(start);
  const endIndex = value.indexOf(end, startIndex + start.length);

  return value.slice(startIndex + start.length, endIndex).trim();
}

