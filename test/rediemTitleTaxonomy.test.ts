import assert from "node:assert/strict";
import { test } from "node:test";
import {
  normalizeRediemTitle,
  scorePersonForRediem
} from "../src/server/scoring/rediemTitleTaxonomy";

const cases = [
  {
    title: "VP Ecommerce",
    personaGroup: "economicBuyer",
    department: "Ecommerce",
    seniority: "VP"
  },
  {
    title: "Director of Retention",
    personaGroup: "operatorBuyer",
    department: "Retention",
    seniority: "Director"
  },
  {
    title: "Lifecycle Marketing Manager",
    personaGroup: "operatorBuyer",
    department: "Lifecycle",
    seniority: "Manager"
  },
  {
    title: "Loyalty Manager",
    personaGroup: "operatorBuyer",
    department: "Loyalty",
    seniority: "Manager"
  },
  {
    title: "Head of Community",
    personaGroup: "operatorBuyer",
    department: "Community",
    seniority: "Head"
  },
  {
    title: "CRM Manager",
    personaGroup: "operatorBuyer",
    department: "CRM",
    seniority: "Manager"
  },
  {
    title: "CMO",
    personaGroup: "economicBuyer",
    department: "Executive",
    seniority: "C-Level"
  },
  {
    title: "Founder",
    personaGroup: "economicBuyer",
    department: "Executive",
    seniority: "Founder"
  },
  {
    title: "Director of Customer Experience",
    personaGroup: "operatorBuyer",
    department: "Customer Experience",
    seniority: "Director"
  },
  {
    title: "Head of Digital",
    personaGroup: "technicalBuyer",
    department: "Digital Product",
    seniority: "Head"
  },
  {
    title: "Co-Founder & CEO",
    personaGroup: "economicBuyer",
    department: "Executive",
    seniority: "Founder"
  },
  {
    title: "Director of Marketing",
    personaGroup: "operatorBuyer",
    department: "Marketing",
    seniority: "Director"
  }
] as const;

for (const item of cases) {
  test(`normalizes Rediem title: ${item.title}`, () => {
    const normalized = normalizeRediemTitle(item.title);

    assert.equal(normalized.personaGroup, item.personaGroup);
    assert.equal(normalized.department, item.department);
    assert.equal(normalized.seniority, item.seniority);
    assert.ok(normalized.matchedKeywords.length > 0);
  });
}

test("scores strong Rediem operator buyer against mature brand profile", () => {
  const score = scorePersonForRediem({
    title: "Director of Retention",
    brandProfile: {
      rediemFitScore: 90,
      hasLoyaltyProgram: true,
      hasSubscription: true,
      hasUGC: true,
      socialCommunityScore: 82
    },
    recentSignals: [
      {
        type: "SUBSCRIPTION",
        title: "Subscription and loyalty signals detected",
        totalScore: 86
      }
    ],
    contactabilityScore: 85,
    sourceConfidence: 0.8
  });

  assert.ok(score.personRediemScore >= 80);
});
