import assert from "node:assert/strict";
import { test } from "node:test";
import {
  normalizeTitle,
  roleHintsForMotion,
  scorePersonForMotion
} from "../src/server/scoring/titleTaxonomy";

test("normalizes founder and CEO titles", () => {
  const normalized = normalizeTitle("Co-Founder & CEO");

  assert.equal(normalized.seniority, "Founder");
  assert.equal(normalized.department, "Executive");
  assert.equal(normalized.personaType, "ECONOMIC_BUYER");
  assert.equal(normalized.roleFamily, "Founder/CEO");
});

test("normalizes RevOps and GTM systems titles", () => {
  const normalized = normalizeTitle("Director of GTM Systems and RevOps");

  assert.equal(normalized.seniority, "Director");
  assert.equal(normalized.department, "Revenue Operations");
  assert.equal(normalized.personaType, "DAY_TO_DAY_OWNER");
  assert.equal(normalized.roleFamily, "RevOps/Sales Ops/GTM Systems");
});

test("classifies platform and security personas as technical buyers", () => {
  const platform = normalizeTitle("VP Platform Engineering");
  const security = normalizeTitle("Chief Information Security Officer");

  assert.equal(platform.department, "Platform");
  assert.equal(platform.personaType, "TECHNICAL_BUYER");
  assert.equal(security.department, "Security");
  assert.equal(security.personaType, "TECHNICAL_BUYER");
});

test("derives role hints from motion", () => {
  assert.deepEqual(
    roleHintsForMotion("AI GTM workflow software").slice(0, 3),
    ["RevOps", "Revenue Operations", "Sales Ops"]
  );
  assert.ok(
    roleHintsForMotion("developer infrastructure").includes(
      "Platform Engineering"
    )
  );
});

test("scores people using role, seniority, department, signals, account context, contactability, and confidence", () => {
  const score = scorePersonForMotion({
    title: "Director of GTM Systems and RevOps",
    motion: "AI GTM workflow software",
    contactabilityScore: 85,
    sourceConfidence: 0.8,
    recentSignals: [
      {
        type: "HIRING",
        title: "Hiring RevOps and GTM Systems roles",
        totalScore: 90
      }
    ],
    accountContext: {
      websiteSummary: "AI workflow software for revenue teams",
      careersSummary: "Hiring RevOps and data roles"
    }
  });

  assert.equal(score.roleMatch, 100);
  assert.equal(score.departmentMatch, 85);
  assert.equal(score.recentSignalMatch, 90);
  assert.equal(score.contactabilityScore, 85);
  assert.equal(score.sourceConfidence, 80);
  assert.equal(score.personScore, 91);
});
