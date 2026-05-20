import assert from "node:assert/strict";
import { test } from "node:test";
import {
  detectedCurrentStack,
  generateDisplacementWedges,
  selectPrimaryDisplacementWedge
} from "../src/server/scoring/displacementWedges";

test("loyalty plus reviews wedge expands participation without rip-and-replace", () => {
  const wedges = generateDisplacementWedges({
    detections: [
      {
        vendor: "LoyaltyLion",
        category: "loyalty",
        confidence: 0.82,
        sourceUrl: "https://brand.example/rewards",
        evidence: "Earn points with LoyaltyLion."
      },
      {
        vendor: "Okendo",
        category: "reviews",
        confidence: 0.8,
        sourceUrl: "https://brand.example/reviews",
        evidence: "Verified reviews powered by Okendo."
      }
    ],
    evidence: [
      {
        id: "ev_rewards",
        fieldName: "competitorToolDetection.loyalty.LoyaltyLion",
        sourceUrl: "https://brand.example/rewards",
        rawExcerpt: "Earn points with LoyaltyLion.",
        confidence: 0.82
      },
      {
        id: "ev_reviews",
        fieldName: "competitorToolDetection.reviews.Okendo",
        sourceUrl: "https://brand.example/reviews",
        rawExcerpt: "Verified reviews powered by Okendo.",
        confidence: 0.8
      }
    ]
  });

  const primary = selectPrimaryDisplacementWedge(wedges);

  assert.equal(wedges.length, 2);
  assert.equal(primary?.vendor, "LoyaltyLion");
  assert.match(primary?.whatNotToSay ?? "", /Do not say 'replace your loyalty platform.'/);
  assert.match(primary?.rediemWedge ?? "", /broader verified participation/);
  assert.match(wedges.find((wedge) => wedge.vendor === "Okendo")?.rediemWedge ?? "", /Turn reviews into referral, reward, and community loops/);
  assert.ok(primary?.supportingDiagnostics.some((item) => item.includes("Reviews and loyalty appear separate")));
  assert.ok(primary?.evidenceIds.includes("ev_rewards"));
  assert.doesNotMatch(`${primary?.recommendedAngle} ${primary?.rediemWedge}`, /rip-and-replace/i);
});

test("Klaviyo and Recharge wedges keep CRM and subscriptions in place", () => {
  const wedges = generateDisplacementWedges({
    detections: [
      { vendor: "Klaviyo", category: "email_sms", confidence: 0.86, sourceUrl: "https://brand.example" },
      { vendor: "Recharge", category: "subscriptions", confidence: 0.78, sourceUrl: "https://brand.example/subscriptions" }
    ]
  });
  const klaviyo = wedges.find((wedge) => wedge.vendor === "Klaviyo");
  const recharge = wedges.find((wedge) => wedge.vendor === "Recharge");

  assert.match(klaviyo?.whatNotToSay ?? "", /replace your CRM/);
  assert.match(klaviyo?.rediemWedge ?? "", /Feed richer participation events into CRM/);
  assert.equal(klaviyo?.migrationRisk, "LOW");
  assert.match(recharge?.whatNotToSay ?? "", /replace subscriptions/);
  assert.match(recharge?.rediemWedge ?? "", /Add participation rewards around subscriber behavior/);
  assert.equal(recharge?.migrationRisk, "HIGH");
});

test("normalizes common vendor aliases and summarizes current stack", () => {
  const wedges = generateDisplacementWedges({
    detections: [
      { vendor: "Smile.io", category: "loyalty", confidence: 0.74 },
      { vendor: "Yotpo Reviews", category: "reviews", confidence: 0.79 },
      { vendor: "Reviews.io", category: "reviews", confidence: 0.71 },
      { vendor: "Postscript", category: "sms", confidence: 0.76 },
      { vendor: "ReferralCandy", category: "referral", confidence: 0.72 },
      { vendor: "Stamped", category: "reviews", confidence: 0.7 },
      { vendor: "Tapcart", category: "mobile_app", confidence: 0.73 },
      { vendor: "Gorgias", category: "support", confidence: 0.69 },
      { vendor: "Shopify", category: "ecommerce", confidence: 0.9 }
    ]
  });
  const vendors = wedges.map((wedge) => wedge.vendor);
  const stack = detectedCurrentStack(wedges);

  assert.ok(vendors.includes("Smile"));
  assert.ok(vendors.includes("Yotpo"));
  assert.ok(vendors.includes("Reviews.io"));
  assert.ok(vendors.includes("Postscript"));
  assert.ok(vendors.includes("ReferralCandy"));
  assert.ok(vendors.includes("Stamped"));
  assert.ok(vendors.includes("Tapcart"));
  assert.ok(vendors.includes("Gorgias"));
  assert.ok(vendors.includes("Shopify"));
  assert.match(stack, /Smile \(loyalty\)/);
  assert.match(stack, /Shopify \(ecommerce\)/);
  assert.ok(
    wedges.every((wedge) => !/replace your CRM|replace subscriptions|replace your loyalty platform/.test(wedge.rediemWedge)),
    "wedge copy should not be combative"
  );
});
