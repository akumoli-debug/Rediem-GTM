import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { generateRediemDossier } from "../src/server/reports/generateRediemDossier";

test("generateRediemDossier renders a readable Rediem account memo", async () => {
  const sample = JSON.parse(
    await readFile("examples/sample-rediem-dossier.json", "utf8")
  ) as unknown;
  const markdown = generateRediemDossier({ dossier: sample as never });

  assert.match(markdown, /^# Sample Beverage Co\. Rediem GTM Account Memo/m);
  assert.match(markdown, /## 1\. Account Snapshot/);
  assert.match(markdown, /## 3\. CFR Summary/);
  assert.match(markdown, /Estimated CFR/);
  assert.match(markdown, /0\.82/);
  assert.match(markdown, /## 4\. Top GTM Diagnostics/);
  assert.match(markdown, /UGC Verification Gap/);
  assert.match(markdown, /Participation Capture Gap/);
  assert.match(markdown, /## 6\. Recommended Rediem Playbook/);
  assert.match(markdown, /UGC-to-owned community|Owned community conversion|Points-to-participation migration/);
  assert.match(markdown, /## 7\. Competitor\/Tool Displacement Wedge/);
  assert.match(markdown, /Do not say 'replace reviews.'|Do not say 'replace subscriptions.'/);
  assert.match(markdown, /Turn reviews into referral, reward, and community loops|Add participation rewards around subscriber behavior/);
  assert.match(markdown, /## 11\. CRM\/n8n Fields/);
  assert.match(markdown, /recommended_gtm_playbook/);
  assert.match(markdown, /## 12\. Evidence And Source URLs/);
  assert.match(markdown, /https:\/\/sample-beverage\.test\/rewards/);
  assert.match(markdown, /## 13\. Confidence And Limitations/);
  assert.match(markdown, /Public prospecting estimates only/);
  assert.match(markdown, /No exact revenue, CAC, churn, retention, conversion, sell-through, customer count, or social volume is inferred/);
});

test("generateRediemDossier labels low-confidence claims clearly", () => {
  const markdown = generateRediemDossier({
    dossier: {
      brandProfile: {
        brandName: "Thin Signal Brand",
        domain: "thin-signal.test"
      },
      rediemScores: {
        rediemFitScore: 42,
        tier: "Tier 3",
        confidence: 0.31
      },
      communityFlywheelRatio: {
        estimatedCfr: 0.7,
        cfrConfidence: 0.28,
        cfrTier: "Emerging Community Loop",
        primaryLeak: "NO_PARTICIPATION_CAPTURE"
      },
      gtmDiagnostics: [
        {
          metricId: "UVG",
          label: "UGC Verification Gap",
          score: 62,
          confidence: 0.24,
          tier: "High",
          explanation: "Possible UGC signal from a thin public source.",
          sourceEvidenceIds: ["ev_low"],
          sourceUrls: ["https://thin-signal.test/community"],
          recommendedPlayTypes: ["UGC_SOCIAL_CHALLENGE"],
          buyerPersonas: ["Head of Community"],
          outboundAngle: "Possible UGC angle, needs review."
        }
      ],
      evidence: [
        {
          id: "ev_low",
          fieldName: "hasUGC",
          value: "possible",
          sourceUrl: "https://thin-signal.test/community",
          confidence: 0.24,
          rawExcerpt: "Possible community mention."
        }
      ]
    }
  });

  assert.match(markdown, /24% low confidence/);
  assert.match(markdown, /Low-confidence CFR/);
  assert.match(markdown, /Low-confidence diagnostics/);
  assert.match(markdown, /MANUAL_REVIEW|manual review/i);
});
