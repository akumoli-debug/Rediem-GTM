import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateAccountScore,
  calculateFreshnessScore,
  calculateSourceQualityScore,
  scoreSignal
} from "../src/server/scoring/signals";

const NOW = new Date("2026-05-14T12:00:00.000Z");

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 86_400_000);
}

test("freshness decay follows configured day buckets", () => {
  assert.equal(calculateFreshnessScore(daysAgo(0), NOW), 100);
  assert.equal(calculateFreshnessScore(daysAgo(14), NOW), 100);
  assert.equal(calculateFreshnessScore(daysAgo(15), NOW), 75);
  assert.equal(calculateFreshnessScore(daysAgo(45), NOW), 75);
  assert.equal(calculateFreshnessScore(daysAgo(46), NOW), 50);
  assert.equal(calculateFreshnessScore(daysAgo(90), NOW), 50);
  assert.equal(calculateFreshnessScore(daysAgo(91), NOW), 25);
  assert.equal(calculateFreshnessScore(daysAgo(180), NOW), 25);
  assert.equal(calculateFreshnessScore(daysAgo(181), NOW), 10);
});

test("source quality maps source categories to configured scores", () => {
  assert.equal(calculateSourceQualityScore("COMPANY_WEBSITE"), 95);
  assert.equal(calculateSourceQualityScore("COMPANY_CAREERS"), 95);
  assert.equal(calculateSourceQualityScore("COMPANY_PRESS"), 95);
  assert.equal(calculateSourceQualityScore("REPUTABLE_NEWS"), 85);
  assert.equal(calculateSourceQualityScore("LINKEDIN_OR_SOCIAL"), 75);
  assert.equal(calculateSourceQualityScore("GENERIC_WEB"), 60);
  assert.equal(calculateSourceQualityScore("UNKNOWN"), 40);
});

test("signal relevance responds to AI GTM workflow focus", () => {
  const scored = scoreSignal(
    {
      type: "HIRING",
      title: "Hiring RevOps, GTM Systems, SDR, and AI Data roles",
      signalDate: daysAgo(7),
      sourceCategory: "COMPANY_CAREERS"
    },
    {
      focus: "selling AI GTM workflow software",
      now: NOW
    }
  );

  assert.equal(scored.freshnessScore, 100);
  assert.equal(scored.sourceQualityScore, 95);
  assert.equal(scored.relevanceScore, 100);
  assert.equal(scored.totalScore, 99);
});

test("signal relevance responds to developer infrastructure focus", () => {
  const scored = scoreSignal(
    {
      type: "TECH_STACK",
      title: "Platform engineering invests in DevOps, SRE, and security",
      signalDate: daysAgo(30),
      sourceCategory: "REPUTABLE_NEWS"
    },
    {
      focus: "selling developer infrastructure",
      now: NOW
    }
  );

  assert.equal(scored.freshnessScore, 75);
  assert.equal(scored.sourceQualityScore, 85);
  assert.equal(scored.relevanceScore, 100);
  assert.equal(scored.totalScore, 90);
});

test("account score uses weighted max signal, top three average, fit, hiring momentum, and confidence", () => {
  const score = calculateAccountScore({
    signals: [
      { type: "HIRING", totalScore: 90 },
      { type: "PRODUCT_LAUNCH", totalScore: 80 },
      { type: "NEWS", totalScore: 60 },
      { type: "COMPLIANCE", totalScore: 40 }
    ],
    companyFitScore: 70,
    evidenceConfidence: 80
  });

  assert.equal(score, 83);
});
