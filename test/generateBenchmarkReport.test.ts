import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { generateBenchmarkReport } from "../src/server/reports/generateBenchmarkReport";

test("generateBenchmarkReport renders a polished sample benchmark report", async () => {
  const sample = JSON.parse(
    await readFile("examples/benchmarks/sample-brands-benchmark.json", "utf8")
  ) as unknown;
  const markdown = generateBenchmarkReport(sample as never);

  assert.match(markdown, /^# Sample\/Demo Community Flywheel Benchmark 2026/m);
  assert.match(markdown, /Demo benchmark generated from sample brand records/);
  assert.match(markdown, /not real market statistics/);
  assert.match(markdown, /## 2\. Median CFR By Category/);
  assert.match(markdown, /\| Beauty \| 3 \| 1\.04 \| 59% medium \|/);
  assert.match(markdown, /\| Functional Beverage \| 3 \| 0\.82 \| 61% medium \|/);
  assert.match(markdown, /## 3\. Highest Participation Capture Gap Categories/);
  assert.match(markdown, /\| Beauty \| 84 \| High visible participation with weak owned capture/);
  assert.match(markdown, /## 4\. Strongest Retail-to-Community Bridge Opportunities/);
  assert.match(markdown, /\| Functional Beverage \| 83 \| Retail reach can become owned profiles/);
  assert.match(markdown, /## 5\. Most Common Participation Leaks/);
  assert.match(markdown, /Retail Not Connected To DTC|UGC Not Verified/);
  assert.match(markdown, /## 6\. Most Common Stack Fragmentation Patterns/);
  assert.match(markdown, /Commerce plus fragmented retention stack/);
  assert.match(markdown, /## 7\. Top Rediem Playbooks By Category/);
  assert.match(markdown, /Retail-to-owned data bridge/);
  assert.match(markdown, /## 8\. Sample Outbound Angles By Category/);
  assert.match(markdown, /## 9\. How CFR Becomes A Public Category Asset/);
  assert.match(markdown, /Publish CFR as a category-level diagnostic/);
  assert.match(markdown, /## 10\. Confidence And Data Limitations/);
  assert.doesNotMatch(markdown, /the market shows|market-wide/i);
});

test("generateBenchmarkReport can render provided-data mode without sample title", () => {
  const markdown = generateBenchmarkReport({
    title: "Provided Panel",
    reportDate: "2026-05-20",
    isSampleData: false,
    brands: [
      {
        brandName: "Provided Brand",
        category: "Beauty",
        estimatedCfr: 1.2,
        cfrConfidence: 0.72,
        gtmDiagnostics: [
          { metricId: "PCG", score: 81, confidence: 0.7 },
          { metricId: "RCBI", score: 62, confidence: 0.62 }
        ],
        recommendedPlaybooks: [
          { id: "UGC_TO_OWNED_COMMUNITY", title: "UGC-to-owned community" }
        ],
        outboundAngle: "Provided-data angle."
      }
    ]
  });

  assert.match(markdown, /^# Provided Panel/m);
  assert.doesNotMatch(markdown, /^# Sample\/Demo/m);
  assert.match(markdown, /Dataset mode \| Provided data/);
  assert.match(markdown, /Validate data rights, collection methods, and representativeness/);
});
