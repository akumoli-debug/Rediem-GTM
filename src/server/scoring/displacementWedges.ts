import type { RediemCompetitorToolDetectionInput } from "./rediem";

export type MigrationRisk = "LOW" | "MEDIUM" | "HIGH";

export type DisplacementWedgeEvidence = {
  id?: string | null;
  fieldName?: string | null;
  sourceUrl?: string | null;
  rawExcerpt?: string | null;
  confidence?: number | null;
};

export type RediemDisplacementWedge = {
  vendor: string;
  category: string;
  likelyCurrentMotion: string;
  whatNotToSay: string;
  rediemWedge: string;
  migrationRisk: MigrationRisk;
  recommendedAngle: string;
  buyerPersona: string;
  supportingDiagnostics: string[];
  confidence: number;
  evidenceIds: string[];
  sourceUrls: string[];
};

export type GenerateDisplacementWedgesInput = {
  detections: RediemCompetitorToolDetectionInput[];
  evidence?: DisplacementWedgeEvidence[];
};

type VendorWedgeTemplate = {
  canonicalVendor: string;
  category: string;
  aliases: string[];
  likelyCurrentMotion: string;
  whatNotToSay: string;
  rediemWedge: string;
  migrationRisk: MigrationRisk;
  recommendedAngle: string;
  buyerPersona: string;
  priority: number;
};

const VENDOR_WEDGES: VendorWedgeTemplate[] = [
  {
    canonicalVendor: "LoyaltyLion",
    category: "loyalty",
    aliases: ["loyaltylion"],
    likelyCurrentMotion: "Points, tiers, referrals, and VIP rewards anchored to purchase behavior.",
    whatNotToSay: "Do not say 'replace your loyalty platform.'",
    rediemWedge: "Move from points and referrals into broader verified participation across reviews, referrals, UGC, preferences, events, and retail proof.",
    migrationRisk: "MEDIUM",
    recommendedAngle: "Keep the loyalty investment intact while Rediem expands what can be verified, rewarded, and routed back into the customer profile.",
    buyerPersona: "Director of Retention or Loyalty Lead",
    priority: 95
  },
  {
    canonicalVendor: "Smile",
    category: "loyalty",
    aliases: ["smile", "smile.io", "smile ui", "smile rewards"],
    likelyCurrentMotion: "Lightweight rewards, points, VIP tiers, and referral mechanics.",
    whatNotToSay: "Do not say 'replace your loyalty platform.'",
    rediemWedge: "Move from points and referrals into broader verified participation across reviews, referrals, UGC, preferences, events, and retail proof.",
    migrationRisk: "MEDIUM",
    recommendedAngle: "Position Rediem as the participation layer that gives the existing rewards motion more behaviors to recognize.",
    buyerPersona: "Retention Marketing Manager or Ecommerce Manager",
    priority: 94
  },
  {
    canonicalVendor: "Yotpo",
    category: "reviews",
    aliases: ["yotpo", "yotpo reviews", "yotpo loyalty", "swell rewards"],
    likelyCurrentMotion: "Reviews, loyalty, SMS, or referral modules used as channel-specific retention infrastructure.",
    whatNotToSay: "Do not say 'replace Yotpo' or 'replace reviews.'",
    rediemWedge: "Turn reviews into referral, reward, and community loops by verifying more customer actions around the review moment.",
    migrationRisk: "HIGH",
    recommendedAngle: "Start around participation expansion: reviews can become the proof point that triggers referral, reward, and lifecycle events.",
    buyerPersona: "VP Ecommerce, Director of Retention, or Customer Marketing Lead",
    priority: 92
  },
  {
    canonicalVendor: "Okendo",
    category: "reviews",
    aliases: ["okendo"],
    likelyCurrentMotion: "Product reviews, attributes, surveys, and social proof collection.",
    whatNotToSay: "Do not say 'replace reviews.'",
    rediemWedge: "Turn reviews into referral, reward, and community loops by connecting verified review activity to broader participation journeys.",
    migrationRisk: "HIGH",
    recommendedAngle: "Use Rediem to reward and route post-review behaviors into community, referral, and zero-party data loops.",
    buyerPersona: "Director of Ecommerce or Customer Marketing Lead",
    priority: 91
  },
  {
    canonicalVendor: "Reviews.io",
    category: "reviews",
    aliases: ["reviews.io", "reviewsio"],
    likelyCurrentMotion: "Review capture, ratings, and social proof syndication.",
    whatNotToSay: "Do not say 'replace reviews.'",
    rediemWedge: "Turn review capture into verified participation loops that can trigger rewards, referrals, and community activation.",
    migrationRisk: "HIGH",
    recommendedAngle: "Anchor the conversation on what happens after a customer leaves proof, not on review widget replacement.",
    buyerPersona: "Ecommerce Manager or Customer Marketing Lead",
    priority: 88
  },
  {
    canonicalVendor: "Stamped",
    category: "reviews",
    aliases: ["stamped", "stamped.io", "stamped io"],
    likelyCurrentMotion: "Review requests, ratings, UGC, and sometimes points or referral programs.",
    whatNotToSay: "Do not say 'replace Stamped' or 'replace reviews.'",
    rediemWedge: "Extend review and UGC moments into verified participation that can power rewards, referrals, and community campaigns.",
    migrationRisk: "HIGH",
    recommendedAngle: "Frame Rediem as the connective layer between proof collection and the next customer action.",
    buyerPersona: "Retention Marketing Manager or Ecommerce Manager",
    priority: 87
  },
  {
    canonicalVendor: "Recharge",
    category: "subscriptions",
    aliases: ["recharge", "rechargepayments", "recharge payments"],
    likelyCurrentMotion: "Subscription, replenishment, bundle, and subscriber account management.",
    whatNotToSay: "Do not say 'replace subscriptions.'",
    rediemWedge: "Add participation rewards around subscriber behavior, including replenishment milestones, reviews, referrals, education, and preference capture.",
    migrationRisk: "HIGH",
    recommendedAngle: "Make subscriber retention feel earned through participation rather than handled only through subscription discounts.",
    buyerPersona: "Head of Retention or Subscription Program Owner",
    priority: 90
  },
  {
    canonicalVendor: "Klaviyo",
    category: "email_sms",
    aliases: ["klaviyo"],
    likelyCurrentMotion: "Lifecycle email, SMS, segmentation, flows, and customer profile orchestration.",
    whatNotToSay: "Do not say 'replace your CRM' or 'replace Klaviyo.'",
    rediemWedge: "Feed richer participation events into CRM so lifecycle teams can segment on verified actions, not just orders and clicks.",
    migrationRisk: "LOW",
    recommendedAngle: "Position Rediem as a source of high-intent participation events that make Klaviyo flows more relevant.",
    buyerPersona: "Lifecycle Marketing Lead or CRM Manager",
    priority: 84
  },
  {
    canonicalVendor: "Attentive",
    category: "sms",
    aliases: ["attentive"],
    likelyCurrentMotion: "SMS acquisition, campaign sends, triggered messages, and list growth.",
    whatNotToSay: "Do not say 'replace SMS.'",
    rediemWedge: "Create verified participation events that give SMS teams better reasons to message than discounts or campaign blasts.",
    migrationRisk: "LOW",
    recommendedAngle: "Use Rediem to generate consented, behavior-based moments worth sending through Attentive.",
    buyerPersona: "Lifecycle Marketing Lead or SMS Manager",
    priority: 79
  },
  {
    canonicalVendor: "Postscript",
    category: "sms",
    aliases: ["postscript"],
    likelyCurrentMotion: "SMS campaigns, automations, list growth, and revenue recovery.",
    whatNotToSay: "Do not say 'replace SMS.'",
    rediemWedge: "Create verified participation events that give SMS teams better reasons to message than discounts or campaign blasts.",
    migrationRisk: "LOW",
    recommendedAngle: "Use Rediem events to trigger useful SMS moments around reviews, referrals, milestones, and drops.",
    buyerPersona: "Lifecycle Marketing Lead or SMS Manager",
    priority: 78
  },
  {
    canonicalVendor: "Gorgias",
    category: "support",
    aliases: ["gorgias"],
    likelyCurrentMotion: "Customer support, helpdesk, chat, macros, and service ticket management.",
    whatNotToSay: "Do not say 'replace your helpdesk.'",
    rediemWedge: "Turn support moments into participation recovery loops, such as issue resolution follow-up, education, reviews, referrals, and win-back rewards.",
    migrationRisk: "LOW",
    recommendedAngle: "Frame Rediem as a way to convert service interactions into trust-building participation after the ticket is handled.",
    buyerPersona: "Customer Experience Lead or Retention Lead",
    priority: 72
  },
  {
    canonicalVendor: "ReferralCandy",
    category: "referral",
    aliases: ["referralcandy", "referral candy"],
    likelyCurrentMotion: "Give/get referral offers and advocate acquisition.",
    whatNotToSay: "Do not say 'replace referrals.'",
    rediemWedge: "Broaden referrals into a participation program where advocacy can be earned through reviews, UGC, education, and verified purchase proof.",
    migrationRisk: "MEDIUM",
    recommendedAngle: "Start by expanding the advocate motion beyond discount-backed give/get links.",
    buyerPersona: "Growth Marketing Lead or Retention Marketing Manager",
    priority: 82
  },
  {
    canonicalVendor: "Shopify",
    category: "ecommerce",
    aliases: ["shopify", "myshopify", "cdn.shopify"],
    likelyCurrentMotion: "Commerce storefront, checkout, catalog, order, and customer record infrastructure.",
    whatNotToSay: "Do not say 'replace Shopify.'",
    rediemWedge: "Sit alongside Shopify as the verified participation layer that enriches commerce profiles with actions beyond purchases.",
    migrationRisk: "LOW",
    recommendedAngle: "Make Shopify customer records more useful by adding verified reviews, referrals, UGC, preferences, receipts, and community actions.",
    buyerPersona: "VP Ecommerce or Ecommerce Manager",
    priority: 65
  },
  {
    canonicalVendor: "Tapcart",
    category: "mobile_app",
    aliases: ["tapcart"],
    likelyCurrentMotion: "Mobile app storefront, push notifications, app-exclusive launches, and mobile retention.",
    whatNotToSay: "Do not say 'replace the mobile app.'",
    rediemWedge: "Add verified participation challenges and rewards around app behaviors, drops, referrals, reviews, and community actions.",
    migrationRisk: "LOW",
    recommendedAngle: "Position Rediem as a way to make app engagement participatory, not only transactional.",
    buyerPersona: "Mobile Commerce Lead or Retention Lead",
    priority: 73
  }
];

export function generateDisplacementWedges(
  input: GenerateDisplacementWedgesInput
): RediemDisplacementWedge[] {
  const stackContext = summarizeStackContext(input.detections);
  const wedgesByKey = new Map<string, RediemDisplacementWedge>();

  for (const detection of input.detections) {
    const template = findTemplate(detection);
    if (!template) continue;

    const category = normalizeCategory(detection.category) ?? template.category;
    const evidence = matchingEvidence(input.evidence ?? [], detection, template);
    const sourceUrls = uniqueStrings([
      detection.sourceUrl,
      ...evidence.map((item) => item.sourceUrl)
    ]);
    const evidenceIds = uniqueStrings(evidence.map((item) => item.id));
    const confidence = calculateWedgeConfidence(detection, evidence, template);
    const supportingDiagnostics = uniqueStrings([
      ...stackContext,
      ...supportingDiagnosticsFor(template, input.detections)
    ]);
    const wedge: RediemDisplacementWedge = {
      vendor: template.canonicalVendor,
      category,
      likelyCurrentMotion: template.likelyCurrentMotion,
      whatNotToSay: template.whatNotToSay,
      rediemWedge: template.rediemWedge,
      migrationRisk: template.migrationRisk,
      recommendedAngle: template.recommendedAngle,
      buyerPersona: template.buyerPersona,
      supportingDiagnostics,
      confidence,
      evidenceIds,
      sourceUrls
    };

    const key = `${wedge.vendor}:${wedge.category}`;
    const existing = wedgesByKey.get(key);
    if (!existing || wedge.confidence > existing.confidence) {
      wedgesByKey.set(key, wedge);
    }
  }

  return [...wedgesByKey.values()].sort(compareWedges);
}

export function selectPrimaryDisplacementWedge(
  wedges: RediemDisplacementWedge[]
): RediemDisplacementWedge | null {
  return [...wedges].sort(compareWedges)[0] ?? null;
}

export function detectedCurrentStack(wedges: RediemDisplacementWedge[]): string {
  return wedges
    .map((wedge) => `${wedge.vendor} (${wedge.category})`)
    .join(", ");
}

function findTemplate(
  detection: RediemCompetitorToolDetectionInput
): VendorWedgeTemplate | null {
  const vendor = normalizeVendor(detection.vendor);
  if (!vendor) return null;

  return (
    VENDOR_WEDGES.find((template) =>
      template.aliases.some((alias) => normalizeVendor(alias) === vendor)
    ) ?? null
  );
}

function summarizeStackContext(
  detections: RediemCompetitorToolDetectionInput[]
): string[] {
  const categories = new Set(
    detections
      .map((detection) => normalizeCategory(detection.category))
      .filter((category): category is string => Boolean(category))
  );
  const diagnostics: string[] = [];

  if (categories.has("loyalty") && categories.has("reviews")) {
    diagnostics.push("Reviews and loyalty appear separate; Rediem can connect proof, referral, reward, and community actions.");
  }

  if ((categories.has("email_sms") || categories.has("sms")) && (categories.has("loyalty") || categories.has("reviews"))) {
    diagnostics.push("Lifecycle channels can use richer participation events rather than being displaced.");
  }

  if (categories.has("subscriptions") && (categories.has("loyalty") || categories.has("reviews"))) {
    diagnostics.push("Subscriber behavior can be rewarded around replenishment, education, review, referral, and preference capture.");
  }

  if (categories.has("ecommerce") && categories.size > 1) {
    diagnostics.push("Commerce remains the system of record while Rediem adds verified participation events around it.");
  }

  return diagnostics;
}

function supportingDiagnosticsFor(
  template: VendorWedgeTemplate,
  detections: RediemCompetitorToolDetectionInput[]
): string[] {
  const diagnostics = [`Detected ${template.canonicalVendor} as a ${template.category} surface.`];
  const hasKlaviyo = detections.some((detection) => findTemplate(detection)?.canonicalVendor === "Klaviyo");

  if (hasKlaviyo && template.canonicalVendor !== "Klaviyo") {
    diagnostics.push("Klaviyo is present, so Rediem events can be routed into existing lifecycle segmentation.");
  }

  return diagnostics;
}

function matchingEvidence(
  evidence: DisplacementWedgeEvidence[],
  detection: RediemCompetitorToolDetectionInput,
  template: VendorWedgeTemplate
): DisplacementWedgeEvidence[] {
  const vendorTokens = uniqueStrings([
    normalizeVendor(detection.vendor),
    ...template.aliases.map(normalizeVendor)
  ]);
  const sourceUrl = detection.sourceUrl ?? "";

  return evidence.filter((item) => {
    const field = normalizeVendor(item.fieldName);
    const excerpt = normalizeVendor(item.rawExcerpt);
    const sameSource = Boolean(sourceUrl && item.sourceUrl === sourceUrl);
    return (
      sameSource ||
      vendorTokens.some((token) => Boolean(token && (field.includes(token) || excerpt.includes(token))))
    );
  });
}

function calculateWedgeConfidence(
  detection: RediemCompetitorToolDetectionInput,
  evidence: DisplacementWedgeEvidence[],
  template: VendorWedgeTemplate
): number {
  const detectionConfidence = detection.confidence ?? 0.55;
  const evidenceConfidence =
    evidence.length > 0
      ? evidence.reduce((sum, item) => sum + (item.confidence ?? detectionConfidence), 0) / evidence.length
      : detectionConfidence;
  const sourceBoost = detection.sourceUrl || evidence.some((item) => item.sourceUrl) ? 0.04 : 0;
  const riskPenalty = template.migrationRisk === "HIGH" ? 0.03 : 0;

  return roundConfidence(clamp(0.7 * detectionConfidence + 0.3 * evidenceConfidence + sourceBoost - riskPenalty, 0.3, 0.95));
}

function compareWedges(left: RediemDisplacementWedge, right: RediemDisplacementWedge): number {
  const leftTemplate = findTemplate({ vendor: left.vendor, category: left.category });
  const rightTemplate = findTemplate({ vendor: right.vendor, category: right.category });
  return (
    (rightTemplate?.priority ?? 0) - (leftTemplate?.priority ?? 0) ||
    right.confidence - left.confidence ||
    left.vendor.localeCompare(right.vendor)
  );
}

function normalizeVendor(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeCategory(value: string | null | undefined): string | null {
  const category = normalizeVendor(value);
  if (!category) return null;
  if (category === "subscription" || category === "subscriptions") return "subscriptions";
  if (category === "review" || category === "reviews") return "reviews";
  if (category === "email" || category === "email sms" || category === "crm") return "email_sms";
  if (category === "text" || category === "sms") return "sms";
  if (category === "mobile" || category === "mobile app") return "mobile_app";
  return category.replace(/\s+/g, "_");
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())))];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundConfidence(value: number): number {
  return Math.round(value * 100) / 100;
}
