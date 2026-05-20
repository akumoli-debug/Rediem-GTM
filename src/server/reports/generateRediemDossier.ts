import {
  selectRediemPlaybooks,
  type RediemPlaybookSelection
} from "@/server/playbooks/rediemPlaybooks";
import type { CommunityFlywheelSnapshotEstimate } from "@/server/scoring/communityFlywheel";
import {
  generateDisplacementWedges,
  selectPrimaryDisplacementWedge,
  type RediemDisplacementWedge
} from "@/server/scoring/displacementWedges";
import type { GtmDiagnosticScore } from "@/server/scoring/gtmDiagnostics";
import type {
  RediemBrandProfileInput,
  RediemCompetitorToolDetectionInput,
  RediemSignalInput
} from "@/server/scoring/rediem";

export type GenerateRediemDossierInput = {
  dossier: RediemDossierSource;
};

export type RediemDossierSource = {
  note?: string;
  domain?: string;
  accountName?: string;
  brandProfile?: Record<string, unknown> & RediemBrandProfileInput;
  communityArchetypes?: string[];
  rediemScores?: Record<string, unknown>;
  communityFlywheelRatio?: Partial<CommunityFlywheelSnapshotEstimate>;
  gtmDiagnostics?: GtmDiagnosticScore[];
  topDiagnostics?: Array<Partial<GtmDiagnosticScore>>;
  primaryGtmDiagnosis?: Partial<GtmDiagnosticScore> | null;
  recommendedPlayTypes?: string[];
  flywheelLeaks?: Array<Record<string, unknown>>;
  activationIdeas?: Array<Record<string, unknown>>;
  buyerCommittee?: Record<string, Array<Record<string, unknown>>>;
  recommendedFirstContact?: Record<string, unknown>;
  outboundAngles?: Array<Record<string, unknown>>;
  n8nExport?: Record<string, unknown>;
  crmFields?: Record<string, unknown>;
  evidence?: Array<Record<string, unknown>>;
  competitorToolDetections?: RediemCompetitorToolDetectionInput[];
  displacementWedges?: RediemDisplacementWedge[];
  primaryDisplacementWedge?: RediemDisplacementWedge | null;
  detectedCurrentStack?: string;
  whatNotToSay?: string | null;
  rediemWedge?: string | null;
  signals?: RediemSignalInput[];
  sourceUrls?: string[];
};

type MarkdownSection = {
  title: string;
  body: string[];
};

export function generateRediemDossier(input: GenerateRediemDossierInput): string {
  const dossier = input.dossier;
  const profile = dossier.brandProfile ?? {};
  const brandName = stringValue(profile.brandName) ?? stringValue(dossier.accountName) ?? titleizeDomain(domainFor(dossier));
  const domain = domainFor(dossier);
  const diagnostics = dossier.gtmDiagnostics ?? [];
  const topDiagnostics = selectTopDiagnostics(dossier, diagnostics);
  const playbookSelections = selectRediemPlaybooks({
    gtmDiagnostics: diagnostics,
    communityFlywheelRatio: dossier.communityFlywheelRatio as CommunityFlywheelSnapshotEstimate | undefined,
    brandProfile: profile,
    signals: dossier.signals ?? [],
    detections: dossier.competitorToolDetections ?? detectionsFromProfile(profile),
    evidence: evidenceForPlaybooks(dossier)
  });
  const recommendedPlaybook = playbookSelections[0] ?? null;
  const bestBuyer = bestBuyerPersona(dossier, recommendedPlaybook);
  const firstAngle = firstOutboundAngle(dossier, recommendedPlaybook);
  const activationIdea = thirtyDayActivationIdea(dossier, recommendedPlaybook);
  const sections: MarkdownSection[] = [
    accountSnapshotSection(dossier, brandName, domain),
    whyFitSection(dossier),
    cfrSection(dossier),
    diagnosticsSection(topDiagnostics),
    leaksSection(dossier),
    playbookSection(recommendedPlaybook, dossier),
    displacementSection(dossier, profile),
    buyerSection(bestBuyer),
    outboundSection(firstAngle),
    activationSection(activationIdea),
    crmN8nSection(dossier),
    evidenceSection(dossier),
    limitationsSection(dossier, topDiagnostics, recommendedPlaybook)
  ];

  return [
    `# ${brandName} Rediem GTM Account Memo`,
    "",
    italic("Sharp account plan from public and mocked GTM evidence. Scores are prospecting estimates, not customer analytics."),
    "",
    ...sections.flatMap((section) => renderSection(section)),
    ""
  ].join("\n");
}

function accountSnapshotSection(
  dossier: RediemDossierSource,
  brandName: string,
  domain: string
): MarkdownSection {
  const profile = dossier.brandProfile ?? {};
  const scores = dossier.rediemScores ?? {};

  return {
    title: "1. Account Snapshot",
    body: [
      table([
        ["Brand", brandName],
        ["Domain", domain],
        ["Category", compactJoin([stringValue(profile.brandCategory), stringValue(profile.productCategory)], " / ")],
        ["Target customer", stringValue(profile.targetCustomer) ?? "Unknown"],
        ["Commerce stack", compactJoin([stringValue(profile.ecommercePlatform), stringValue(profile.subscriptionProvider), stringValue(profile.loyaltyProvider), stringValue(profile.reviewProvider)], ", ")],
        ["Rediem fit", scoreWithTier(numberValue(scores.rediemFitScore), stringValue(scores.tier), numberValue(scores.confidence))],
        ["Community archetypes", listInline(dossier.communityArchetypes)],
        ["Public-signal note", dossier.note ?? "Public prospecting estimates should be reviewed before outbound."]
      ])
    ]
  };
}

function whyFitSection(dossier: RediemDossierSource): MarkdownSection {
  const profile = dossier.brandProfile ?? {};
  const scores = dossier.rediemScores ?? {};
  const reasons = [
    profile.hasReviews ? `Reviews are visible${withProvider(profile.reviewProvider)}.` : null,
    profile.hasUGC ? "UGC or creator/community participation is visible." : null,
    profile.hasSubscription ? `Subscription/replenishment exists${withProvider(profile.subscriptionProvider)}.` : null,
    profile.hasRetailPresence ? "Retail presence creates a retail-to-owned data bridge opportunity." : null,
    profile.hasLoyaltyProgram ? `Loyalty is present${withProvider(profile.loyaltyProvider)}, creating a migration surface.` : null,
    profile.missionDrivenAngle || profile.sustainabilityAngle ? `Mission/identity hook: ${compactJoin([stringValue(profile.missionDrivenAngle), stringValue(profile.sustainabilityAngle)], "; ")}` : null
  ].filter((item): item is string => Boolean(item));

  return {
    title: "2. Why This Brand Is A Rediem Fit",
    body: [
      `Rediem fit score: **${scoreWithTier(numberValue(scores.rediemFitScore), stringValue(scores.tier), numberValue(scores.confidence))}**.`,
      bulletList(reasons.length > 0 ? reasons : ["Visible Rediem fit signals are limited; route to research review before outbound."])
    ]
  };
}

function cfrSection(dossier: RediemDossierSource): MarkdownSection {
  const cfr = dossier.communityFlywheelRatio ?? {};
  const explanation = Array.isArray(cfr.explanation) ? cfr.explanation : [];

  return {
    title: "3. CFR Summary",
    body: [
      table([
        ["Estimated CFR", safeNumber(cfr.estimatedCfr)],
        ["Tier", stringValue(cfr.cfrTier) ?? "Unknown"],
        ["Confidence", confidenceLabel(numberValue(cfr.cfrConfidence))],
        ["Earned community growth", safeNumber(cfr.earnedCommunityGrowth)],
        ["Subsidized transactional growth", safeNumber(cfr.subsidizedTransactionalGrowth)],
        ["Primary leak", formatCode(stringValue(cfr.primaryLeak))],
        ["Recommended CFR play", formatCode(stringValue(cfr.recommendedPlay))]
      ]),
      explanation.length > 0
        ? bulletList(explanation.map((item) => String(item)))
        : lowConfidenceSentence("CFR explanation is missing; do not use this as an outbound claim without review.")
    ]
  };
}

function diagnosticsSection(topDiagnostics: Array<Partial<GtmDiagnosticScore>>): MarkdownSection {
  const rows = topDiagnostics.map((diagnostic) => [
    compactJoin([stringValue(diagnostic.label), stringValue(diagnostic.metricId) ? `(${diagnostic.metricId})` : ""], " "),
    safeNumber(diagnostic.score),
    confidenceLabel(numberValue(diagnostic.confidence)),
    stringValue(diagnostic.tier) ?? "Unknown",
    stringValue(diagnostic.explanation) ?? "No explanation provided."
  ]);

  return {
    title: "4. Top GTM Diagnostics",
    body: rows.length > 0
      ? [markdownTable(["Diagnostic", "Score", "Confidence", "Tier", "Read"], rows)]
      : [lowConfidenceSentence("No high-confidence GTM diagnostics are available.")]
  };
}

function leaksSection(dossier: RediemDossierSource): MarkdownSection {
  const leaks = dossier.flywheelLeaks ?? [];
  const items = leaks.slice(0, 5).map((leak) => {
    const severity = numberValue(leak.severity);
    const description = stringValue(leak.description) ?? "No description.";
    const fix = stringValue(leak.recommendedFix);
    return `**${formatCode(stringValue(leak.leakType))}**${severity == null ? "" : ` (${severity}/100)`}: ${description}${fix ? ` Recommended fix: ${fix}` : ""}`;
  });

  return {
    title: "5. Participation Leaks",
    body: [bulletList(items.length > 0 ? items : ["No participation leaks are available in the dossier."])]
  };
}

function playbookSection(
  selection: RediemPlaybookSelection | null,
  dossier: RediemDossierSource
): MarkdownSection {
  if (!selection) {
    return {
      title: "6. Recommended Rediem Playbook",
      body: [lowConfidenceSentence("No playbook met the selection threshold. Route this account to manual review.")]
    };
  }

  const fallbackPlayTypes = dossier.recommendedPlayTypes?.map((item) => formatCode(item)) ?? [];

  return {
    title: "6. Recommended Rediem Playbook",
    body: [
      `**${selection.playbook.title}** (${formatCode(selection.playbook.id)})`,
      `Thesis: ${selection.playbook.thesis}`,
      `Readiness: **${selection.readiness}** at ${confidenceLabel(selection.confidence)}.`,
      selection.whySelected.length > 0 ? bulletList(selection.whySelected) : "",
      fallbackPlayTypes.length > 0 ? `Related Rediem play types: ${fallbackPlayTypes.join(", ")}.` : ""
    ].filter(Boolean)
  };
}

function displacementSection(
  dossier: RediemDossierSource,
  profile: Record<string, unknown>
): MarkdownSection {
  const detectionInputs = [
    ...(dossier.competitorToolDetections ?? []),
    ...detectionsFromProfile(profile)
  ];
  const wedges = dossier.displacementWedges?.length
    ? dossier.displacementWedges
    : generateDisplacementWedges({
        detections: detectionInputs,
        evidence: evidenceForDisplacement(dossier)
      });
  const primary = dossier.primaryDisplacementWedge ?? selectPrimaryDisplacementWedge(wedges);
  const detectedStack = stringValue(dossier.detectedCurrentStack) ?? toolRows(detectionInputs).join(", ");

  return {
    title: "7. Competitor/Tool Displacement Wedge",
    body: wedges.length > 0
      ? [
          "This is not a rip-and-replace claim. It is the wedge for where Rediem can become the participation layer across existing tools.",
          primary
            ? table([
                ["Primary wedge", primary.recommendedAngle],
                ["Detected current stack", detectedStack],
                ["What not to say", stringValue(dossier.whatNotToSay) ?? primary.whatNotToSay],
                ["Rediem wedge", stringValue(dossier.rediemWedge) ?? primary.rediemWedge],
                ["Best buyer", primary.buyerPersona],
                ["Migration risk", primary.migrationRisk],
                ["Confidence", confidenceLabel(primary.confidence)]
              ])
            : "",
          markdownTable(
            ["Vendor", "Category", "Current motion", "Recommended angle", "Sources"],
            wedges.map((wedge) => [
              wedge.vendor,
              wedge.category,
              wedge.likelyCurrentMotion,
              wedge.recommendedAngle,
              wedge.sourceUrls.map(linkOrText).join(", ") || "Unknown"
            ])
          )
        ]
      : [lowConfidenceSentence("No reliable tool displacement wedge is present in the dossier.")]
  };
}

function buyerSection(bestBuyer: string): MarkdownSection {
  return {
    title: "8. Best Buyer Persona",
    body: [bestBuyer]
  };
}

function outboundSection(angle: string): MarkdownSection {
  return {
    title: "9. First Outbound Angle",
    body: [quote(angle)]
  };
}

function activationSection(idea: string): MarkdownSection {
  return {
    title: "10. 30-Day Activation Idea",
    body: [idea]
  };
}

function crmN8nSection(dossier: RediemDossierSource): MarkdownSection {
  const crmRows = Object.entries(dossier.crmFields ?? {})
    .slice(0, 18)
    .map(([key, value]) => [formatCode(key), formatValue(value)]);
  const n8nRows = Object.entries(dossier.n8nExport ?? {})
    .slice(0, 12)
    .map(([key, value]) => [formatCode(key), formatValue(value)]);

  return {
    title: "11. CRM/n8n Fields",
    body: [
      crmRows.length > 0 ? markdownTable(["CRM field", "Value"], crmRows) : "No CRM field map provided.",
      n8nRows.length > 0 ? markdownTable(["n8n field", "Value"], n8nRows) : "No n8n export map provided."
    ]
  };
}

function evidenceSection(dossier: RediemDossierSource): MarkdownSection {
  const evidence = dossier.evidence ?? [];
  const evidenceRows = evidence.slice(0, 12).map((item) => [
    stringValue(item.id) ?? "-",
    stringValue(item.fieldName) ?? "Unknown",
    confidenceLabel(numberValue(item.confidence)),
    linkOrText(stringValue(item.sourceUrl)),
    truncate(stringValue(item.rawExcerpt) ?? formatValue(item.value), 120)
  ]);
  const sourceUrls = unique([
    ...(dossier.sourceUrls ?? []),
    ...evidence.map((item) => stringValue(item.sourceUrl)).filter((item): item is string => Boolean(item))
  ]);

  return {
    title: "12. Evidence And Source URLs",
    body: [
      evidenceRows.length > 0
        ? markdownTable(["ID", "Field", "Confidence", "Source", "Excerpt"], evidenceRows)
        : "No evidence records provided.",
      sourceUrls.length > 0 ? `Source URLs: ${sourceUrls.map((url) => linkOrText(url)).join(", ")}` : "No source URLs provided."
    ]
  };
}

function limitationsSection(
  dossier: RediemDossierSource,
  topDiagnostics: Array<Partial<GtmDiagnosticScore>>,
  selection: RediemPlaybookSelection | null
): MarkdownSection {
  const lowConfidenceDiagnostics = (dossier.gtmDiagnostics ?? [])
    .filter((diagnostic) => diagnostic.confidence < 0.45)
    .map((diagnostic) => `${diagnostic.label} (${confidenceLabel(diagnostic.confidence)})`);
  const cfrConfidence = numberValue(dossier.communityFlywheelRatio?.cfrConfidence);
  const notes = [
    "Public prospecting estimates only. Do not treat CFR or diagnostic scores as exact customer metrics.",
    "No exact revenue, CAC, churn, retention, conversion, sell-through, customer count, or social volume is inferred.",
    cfrConfidence != null && cfrConfidence < 0.5 ? `Low-confidence CFR: ${confidenceLabel(cfrConfidence)}.` : null,
    lowConfidenceDiagnostics.length > 0 ? `Low-confidence diagnostics: ${lowConfidenceDiagnostics.join(", ")}.` : null,
    topDiagnostics.length === 0 ? "No high-confidence diagnostics were available; use this memo for research, not outbound." : null,
    selection?.readiness === "MANUAL_REVIEW" ? "Selected playbook is manual-review only until evidence is validated." : null
  ].filter((item): item is string => Boolean(item));

  return {
    title: "13. Confidence And Limitations",
    body: [bulletList(notes)]
  };
}

function selectTopDiagnostics(
  dossier: RediemDossierSource,
  diagnostics: GtmDiagnosticScore[]
): Array<Partial<GtmDiagnosticScore>> {
  if (dossier.topDiagnostics && dossier.topDiagnostics.length > 0) {
    return dossier.topDiagnostics.slice(0, 3).map((diagnostic) => ({
      ...diagnostics.find((item) => item.metricId === diagnostic.metricId),
      ...diagnostic
    }));
  }

  return [...diagnostics]
    .filter((diagnostic) => diagnostic.confidence >= 0.45)
    .sort((left, right) => right.score - left.score || right.confidence - left.confidence)
    .slice(0, 3);
}

function bestBuyerPersona(
  dossier: RediemDossierSource,
  selection: RediemPlaybookSelection | null
): string {
  const firstContact = dossier.recommendedFirstContact ?? {};
  const contactTitle = stringValue(firstContact.title);
  const contactReason = stringValue(firstContact.reason);

  if (contactTitle) {
    return `Start with **${contactTitle}**. ${contactReason ?? "This role is closest to the participation, retention, and lifecycle motion."}`;
  }

  const persona = selection?.playbook.recommendedBuyerPersonas[0];
  return persona
    ? `Start with **${persona}** based on the selected playbook.`
    : lowConfidenceSentence("No buyer persona is available; resolve the Rediem buying committee before outbound.");
}

function firstOutboundAngle(
  dossier: RediemDossierSource,
  selection: RediemPlaybookSelection | null
): string {
  const explicitAngle = dossier.outboundAngles?.[0];
  const oneLiner = stringValue(explicitAngle?.suggestedOneLiner);

  return oneLiner ?? selection?.playbook.outboundAngle ?? lowConfidenceSentence("No outbound angle is available; generate one only after evidence review.");
}

function thirtyDayActivationIdea(
  dossier: RediemDossierSource,
  selection: RediemPlaybookSelection | null
): string {
  const idea = dossier.activationIdeas?.[0];
  const title = stringValue(idea?.title);
  const targetBehavior = stringValue(idea?.targetBehavior);
  const why = stringValue(idea?.whyItFits);

  if (title) {
    return compactJoin([
      `**${title}.**`,
      targetBehavior ? `Target behavior: ${targetBehavior}.` : "",
      why ? `Why it fits: ${why}` : ""
    ], " ");
  }

  return selection?.playbook.activationIdea ?? lowConfidenceSentence("No activation idea is available.");
}

function detectionsFromProfile(profile: Record<string, unknown>): RediemCompetitorToolDetectionInput[] {
  const detections: RediemCompetitorToolDetectionInput[] = [];
  const loyaltyProvider = stringValue(profile.loyaltyProvider);
  const reviewProvider = stringValue(profile.reviewProvider);
  const subscriptionProvider = stringValue(profile.subscriptionProvider);
  const ecommercePlatform = stringValue(profile.ecommercePlatform);

  if (loyaltyProvider) detections.push({ category: "loyalty", vendor: loyaltyProvider });
  if (reviewProvider) detections.push({ category: "reviews", vendor: reviewProvider });
  if (subscriptionProvider) detections.push({ category: "subscriptions", vendor: subscriptionProvider });
  if (ecommercePlatform) detections.push({ category: "ecommerce", vendor: ecommercePlatform });

  return detections;
}

function evidenceForPlaybooks(dossier: RediemDossierSource) {
  return (dossier.evidence ?? []).map((item) => ({
    id: stringValue(item.id),
    fieldName: stringValue(item.fieldName),
    value: stringValue(item.value),
    sourceUrl: stringValue(item.sourceUrl),
    provider: stringValue(item.provider),
    rawExcerpt: stringValue(item.rawExcerpt),
    confidence: numberValue(item.confidence)
  }));
}

function evidenceForDisplacement(dossier: RediemDossierSource) {
  return (dossier.evidence ?? []).map((item) => ({
    id: stringValue(item.id),
    fieldName: stringValue(item.fieldName),
    sourceUrl: stringValue(item.sourceUrl),
    rawExcerpt: stringValue(item.rawExcerpt),
    confidence: numberValue(item.confidence)
  }));
}

function toolRows(detections: RediemCompetitorToolDetectionInput[] | undefined): string[] {
  return (detections ?? [])
    .filter((detection) => detection.vendor)
    .map((detection) => {
      const confidence = detection.confidence == null ? "" : ` (${confidenceLabel(detection.confidence)})`;
      return `${detection.vendor} in ${detection.category ?? "unknown"}${confidence}${detection.sourceUrl ? `: ${linkOrText(detection.sourceUrl)}` : ""}`;
    });
}

function renderSection(section: MarkdownSection): string[] {
  return [
    `## ${section.title}`,
    "",
    ...section.body.flatMap((line, index) => [
      ...line.split("\n"),
      ...(index < section.body.length - 1 ? [""] : [])
    ]),
    ""
  ];
}

function table(rows: Array<[string, string]>): string {
  return markdownTable(["Field", "Value"], rows);
}

function markdownTable(headers: string[], rows: string[][]): string {
  return [
    `| ${headers.map(escapeTable).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escapeTable).join(" | ")} |`)
  ].join("\n");
}

function bulletList(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

function quote(value: string): string {
  return `> ${value}`;
}

function italic(value: string): string {
  return `_${value}_`;
}

function lowConfidenceSentence(value: string): string {
  return `Low-confidence: ${value}`;
}

function scoreWithTier(score: number | null, tier?: string | null, confidence?: number | null): string {
  return compactJoin([
    score == null ? "Unknown" : `${score}/100`,
    tier ? `(${tier})` : "",
    confidence == null ? "" : `at ${confidenceLabel(confidence)}`
  ], " ");
}

function confidenceLabel(confidence: number | null | undefined): string {
  if (confidence == null) return "unknown confidence";
  const pct = `${Math.round(confidence * 100)}%`;
  if (confidence < 0.45) return `${pct} low confidence`;
  if (confidence < 0.65) return `${pct} medium confidence`;
  return `${pct} high confidence`;
}

function formatCode(value: string | null | undefined): string {
  return value ? `\`${value}\`` : "Unknown";
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Unknown";
  if (Array.isArray(value)) return value.map(formatValue).join(", ");
  if (typeof value === "object") return truncate(JSON.stringify(value), 120);
  return String(value);
}

function linkOrText(value: string | null | undefined): string {
  if (!value) return "Unknown";
  if (/^https?:\/\//.test(value)) return `[${value}](${value})`;
  return value;
}

function safeNumber(value: unknown): string {
  const number = numberValue(value);
  return number == null ? "Unknown" : String(number);
}

function stringValue(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function domainFor(dossier: RediemDossierSource): string {
  return stringValue(dossier.domain) ?? stringValue(dossier.brandProfile?.domain) ?? "unknown-domain";
}

function titleizeDomain(domain: string): string {
  return domain
    .split(".")[0]!
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function listInline(values: unknown): string {
  return Array.isArray(values) && values.length > 0 ? values.map(String).join(", ") : "Unknown";
}

function withProvider(value: unknown): string {
  const provider = stringValue(value);
  return provider ? ` via ${provider}` : "";
}

function compactJoin(values: Array<string | null | undefined>, separator: string): string {
  const compacted = values.filter((value): value is string => Boolean(value && value.trim()));
  return compacted.length > 0 ? compacted.join(separator) : "Unknown";
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function uniqueBy<T>(values: T[], key: (value: T) => string): T[] {
  const seen = new Set<string>();
  const output: T[] = [];
  for (const value of values) {
    const nextKey = key(value);
    if (seen.has(nextKey)) continue;
    seen.add(nextKey);
    output.push(value);
  }
  return output;
}
