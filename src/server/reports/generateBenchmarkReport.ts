export type BenchmarkDiagnosticInput = {
  metricId: string;
  label?: string | null;
  score: number;
  confidence?: number | null;
};

export type BenchmarkLeakInput = {
  leakType: string;
  severity?: number | null;
};

export type BenchmarkStackToolInput = {
  vendor: string;
  category: string;
};

export type BenchmarkPlaybookInput = {
  id: string;
  title: string;
};

export type BenchmarkBrandInput = {
  brandName: string;
  category: string;
  domain?: string | null;
  estimatedCfr: number;
  cfrConfidence?: number | null;
  cfrTier?: string | null;
  gtmDiagnostics?: BenchmarkDiagnosticInput[];
  participationLeaks?: BenchmarkLeakInput[];
  stackTools?: BenchmarkStackToolInput[];
  recommendedPlaybooks?: BenchmarkPlaybookInput[];
  outboundAngle?: string | null;
  sourceUrls?: string[];
};

export type BenchmarkReportInput = {
  title?: string;
  reportDate?: string;
  isSampleData?: boolean;
  methodologyNote?: string;
  brands: BenchmarkBrandInput[];
};

type MarkdownSection = {
  title: string;
  body: string[];
};

type CategorySummary = {
  category: string;
  brandCount: number;
  medianCfr: number;
  medianConfidence: number;
  medianPcg: number | null;
  medianRcbi: number | null;
  topPlaybooks: Array<{ id: string; title: string; count: number }>;
  sampleAngles: string[];
};

type CountRow = {
  label: string;
  count: number;
  categories: string[];
};

const DEFAULT_TITLE = "Community Flywheel Benchmark 2026";
const METRIC_LABELS: Record<string, string> = {
  PCG: "Participation Capture Gap",
  RCBI: "Retail-to-Community Bridge Index",
  MAR: "Mission-to-Action Ratio",
  UVG: "UGC Verification Gap",
  DDR: "Discount Dependence Ratio",
  ZPDD: "Zero-Party Data Depth",
  PDPS: "Product Drop Participation Score",
  SFI: "Stack Fragmentation Index",
  OCCS: "Owned Community Conversion Score"
};

export function generateBenchmarkReport(input: BenchmarkReportInput): string {
  const brands = input.brands ?? [];
  const sampleMode = input.isSampleData !== false;
  const summaries = summarizeCategories(brands);
  const leakRows = topCounts(
    brands.flatMap((brand) =>
      (brand.participationLeaks ?? []).map((leak) => ({
        label: humanize(leak.leakType),
        category: brand.category
      }))
    )
  );
  const stackRows = topCounts(
    brands.flatMap((brand) =>
      stackPatterns(brand.stackTools ?? []).map((pattern) => ({
        label: pattern,
        category: brand.category
      }))
    )
  );
  const sections: MarkdownSection[] = [
    executiveSummarySection(brands, summaries, sampleMode),
    medianCfrSection(summaries),
    participationGapSection(summaries),
    retailBridgeSection(summaries),
    leakSection(leakRows),
    stackSection(stackRows),
    playbookSection(summaries),
    outboundSection(summaries),
    publicAssetSection(sampleMode),
    limitationsSection(input, brands, sampleMode)
  ];
  const titlePrefix = sampleMode ? "Sample/Demo " : "";

  return [
    `# ${titlePrefix}${input.title ?? DEFAULT_TITLE}`,
    "",
    italic(
      sampleMode
        ? "Demo benchmark generated from sample brand records. It illustrates how Rediem could package category-level thought leadership, not real market statistics."
        : "Benchmark generated from provided brand records. Treat category claims according to the provenance and permissions of the underlying dataset."
    ),
    "",
    table([
      ["Report date", input.reportDate ?? "2026-05-20"],
      ["Dataset mode", sampleMode ? "Sample/demo data" : "Provided data"],
      ["Brands analyzed", String(brands.length)],
      ["Categories", String(summaries.length)],
      ["Methodology", input.methodologyNote ?? "Category medians and rankings are computed from the records supplied in the input JSON."]
    ]),
    "",
    ...sections.flatMap(renderSection),
    ""
  ].join("\n");
}

function executiveSummarySection(
  brands: BenchmarkBrandInput[],
  summaries: CategorySummary[],
  sampleMode: boolean
): MarkdownSection {
  const topPcg = [...summaries]
    .filter((summary) => summary.medianPcg != null)
    .sort((left, right) => (right.medianPcg ?? 0) - (left.medianPcg ?? 0))[0];
  const topRcbi = [...summaries]
    .filter((summary) => summary.medianRcbi != null)
    .sort((left, right) => (right.medianRcbi ?? 0) - (left.medianRcbi ?? 0))[0];
  const highestCfr = [...summaries].sort((left, right) => right.medianCfr - left.medianCfr)[0];
  const note = sampleMode
    ? "Because this is sample/demo data, every category claim below should be read as a publishing mockup."
    : "Because this report uses provided data, category claims should be reviewed against collection scope before publication.";

  return {
    title: "1. Executive Read",
    body: [
      note,
      bulletList([
        highestCfr
          ? `${highestCfr.category} has the highest median CFR in this panel at ${formatNumber(highestCfr.medianCfr)}.`
          : "No CFR records were available.",
        topPcg
          ? `${topPcg.category} shows the highest median Participation Capture Gap at ${formatNumber(topPcg.medianPcg)}.`
          : "No PCG records were available.",
        topRcbi
          ? `${topRcbi.category} shows the strongest Retail-to-Community Bridge opportunity at ${formatNumber(topRcbi.medianRcbi)}.`
          : "No RCBI records were available.",
        `The panel includes ${brands.length} brand records across ${summaries.length} categories.`
      ])
    ]
  };
}

function medianCfrSection(summaries: CategorySummary[]): MarkdownSection {
  const rows = [...summaries]
    .sort((left, right) => right.medianCfr - left.medianCfr)
    .map((summary) => [
      summary.category,
      String(summary.brandCount),
      formatNumber(summary.medianCfr),
      confidenceLabel(summary.medianConfidence)
    ]);

  return {
    title: "2. Median CFR By Category",
    body: [
      rows.length > 0
        ? markdownTable(["Category", "Brands", "Median CFR", "Median confidence"], rows)
        : "No category CFR data was provided."
    ]
  };
}

function participationGapSection(summaries: CategorySummary[]): MarkdownSection {
  const rows = summaries
    .filter((summary) => summary.medianPcg != null)
    .sort((left, right) => (right.medianPcg ?? 0) - (left.medianPcg ?? 0))
    .map((summary) => [
      summary.category,
      formatNumber(summary.medianPcg),
      participationGapRead(summary.medianPcg)
    ]);

  return {
    title: "3. Highest Participation Capture Gap Categories",
    body: [
      rows.length > 0
        ? markdownTable(["Category", "Median PCG", "Rediem read"], rows)
        : "No Participation Capture Gap diagnostics were provided."
    ]
  };
}

function retailBridgeSection(summaries: CategorySummary[]): MarkdownSection {
  const rows = summaries
    .filter((summary) => summary.medianRcbi != null)
    .sort((left, right) => (right.medianRcbi ?? 0) - (left.medianRcbi ?? 0))
    .map((summary) => [
      summary.category,
      formatNumber(summary.medianRcbi),
      retailBridgeRead(summary.medianRcbi)
    ]);

  return {
    title: "4. Strongest Retail-to-Community Bridge Opportunities",
    body: [
      rows.length > 0
        ? markdownTable(["Category", "Median RCBI", "Rediem read"], rows)
        : "No Retail-to-Community Bridge diagnostics were provided."
    ]
  };
}

function leakSection(rows: CountRow[]): MarkdownSection {
  return {
    title: "5. Most Common Participation Leaks",
    body: [
      rows.length > 0
        ? markdownTable(
            ["Leak", "Sample count", "Categories observed"],
            rows.map((row) => [row.label, String(row.count), row.categories.join(", ")])
          )
        : "No participation leaks were provided."
    ]
  };
}

function stackSection(rows: CountRow[]): MarkdownSection {
  return {
    title: "6. Most Common Stack Fragmentation Patterns",
    body: [
      rows.length > 0
        ? markdownTable(
            ["Pattern", "Sample count", "Categories observed"],
            rows.map((row) => [row.label, String(row.count), row.categories.join(", ")])
          )
        : "No stack tool patterns were provided."
    ]
  };
}

function playbookSection(summaries: CategorySummary[]): MarkdownSection {
  const rows = summaries.flatMap((summary) =>
    summary.topPlaybooks.slice(0, 2).map((playbook) => [
      summary.category,
      playbook.title,
      playbook.id,
      String(playbook.count)
    ])
  );

  return {
    title: "7. Top Rediem Playbooks By Category",
    body: [
      rows.length > 0
        ? markdownTable(["Category", "Playbook", "ID", "Sample count"], rows)
        : "No playbook recommendations were provided."
    ]
  };
}

function outboundSection(summaries: CategorySummary[]): MarkdownSection {
  const rows = summaries
    .filter((summary) => summary.sampleAngles.length > 0)
    .map((summary) => [
      summary.category,
      summary.sampleAngles.slice(0, 2).map((angle) => quoteInline(angle)).join("<br>")
    ]);

  return {
    title: "8. Sample Outbound Angles By Category",
    body: [
      rows.length > 0
        ? markdownTable(["Category", "Sample angles"], rows)
        : "No sample outbound angles were provided."
    ]
  };
}

function publicAssetSection(sampleMode: boolean): MarkdownSection {
  return {
    title: "9. How CFR Becomes A Public Category Asset",
    body: [
      bulletList([
        "Publish CFR as a category-level diagnostic, not a private customer performance claim.",
        "Use PCG, RCBI, leaks, and stack fragmentation to explain why participation-led commerce matters.",
        "Turn every category insight into a concrete Rediem playbook: retail receipt upload, review-to-referral, UGC verification, subscriber participation, or points-to-participation migration.",
        sampleMode
          ? "Keep all external language labeled as sample/demo until a real, permissioned dataset is used."
          : "State data provenance, sample size, collection dates, and permission scope before external publication."
      ])
    ]
  };
}

function limitationsSection(
  input: BenchmarkReportInput,
  brands: BenchmarkBrandInput[],
  sampleMode: boolean
): MarkdownSection {
  const lowConfidenceCount = brands.filter((brand) => (brand.cfrConfidence ?? 0.5) < 0.45).length;
  const notes = [
    sampleMode
      ? "This benchmark uses sample/demo data. It must not be cited as real market statistics."
      : "This benchmark uses provided data. Validate data rights, collection methods, and representativeness before external use.",
    "CFR and GTM diagnostics are estimates unless backed by first-party customer, commerce, CRM, loyalty, subscription, or analytics data.",
    "Do not infer revenue, CAC, churn, retention, social volume, customer count, review volume, or sell-through from this report.",
    lowConfidenceCount > 0 ? `${lowConfidenceCount} ${lowConfidenceCount === 1 ? "brand record has" : "brand records have"} CFR confidence below 45% and should be treated as directional only.` : null,
    input.methodologyNote ? `Methodology note: ${input.methodologyNote}` : null
  ].filter((note): note is string => Boolean(note));

  return {
    title: "10. Confidence And Data Limitations",
    body: [bulletList(notes)]
  };
}

function summarizeCategories(brands: BenchmarkBrandInput[]): CategorySummary[] {
  const byCategory = new Map<string, BenchmarkBrandInput[]>();

  for (const brand of brands) {
    const category = brand.category || "Unknown";
    byCategory.set(category, [...(byCategory.get(category) ?? []), brand]);
  }

  return [...byCategory.entries()]
    .map(([category, categoryBrands]) => ({
      category,
      brandCount: categoryBrands.length,
      medianCfr: median(categoryBrands.map((brand) => brand.estimatedCfr)),
      medianConfidence: median(categoryBrands.map((brand) => brand.cfrConfidence ?? 0.5)),
      medianPcg: medianMetric(categoryBrands, "PCG"),
      medianRcbi: medianMetric(categoryBrands, "RCBI"),
      topPlaybooks: topPlaybooks(categoryBrands),
      sampleAngles: uniqueStrings(categoryBrands.map((brand) => brand.outboundAngle)).slice(0, 3)
    }))
    .sort((left, right) => left.category.localeCompare(right.category));
}

function medianMetric(brands: BenchmarkBrandInput[], metricId: string): number | null {
  const values = brands
    .map((brand) => metricScore(brand, metricId))
    .filter((value): value is number => value != null);

  return values.length > 0 ? median(values) : null;
}

function metricScore(brand: BenchmarkBrandInput, metricId: string): number | null {
  const diagnostic = (brand.gtmDiagnostics ?? []).find((item) => item.metricId === metricId);
  return diagnostic ? diagnostic.score : null;
}

function topPlaybooks(brands: BenchmarkBrandInput[]): Array<{ id: string; title: string; count: number }> {
  const counts = new Map<string, { id: string; title: string; count: number }>();

  for (const playbook of brands.flatMap((brand) => brand.recommendedPlaybooks ?? [])) {
    const existing = counts.get(playbook.id);
    counts.set(playbook.id, {
      id: playbook.id,
      title: playbook.title,
      count: (existing?.count ?? 0) + 1
    });
  }

  return [...counts.values()].sort((left, right) => right.count - left.count || left.title.localeCompare(right.title));
}

function stackPatterns(tools: BenchmarkStackToolInput[]): string[] {
  const categories = uniqueStrings(tools.map((tool) => normalizeCategory(tool.category))).sort();
  const vendors = uniqueStrings(tools.map((tool) => tool.vendor)).sort();
  const patterns: string[] = [];

  if (categories.includes("loyalty") && categories.includes("reviews")) {
    patterns.push("Loyalty plus reviews split");
  }

  if (categories.includes("subscriptions") && (categories.includes("email_sms") || categories.includes("sms"))) {
    patterns.push("Subscription plus lifecycle messaging split");
  }

  if (categories.includes("ecommerce") && categories.length >= 3) {
    patterns.push("Commerce plus fragmented retention stack");
  }

  if (vendors.includes("Klaviyo") && (categories.includes("loyalty") || categories.includes("reviews"))) {
    patterns.push("CRM fed by disconnected participation tools");
  }

  if (patterns.length === 0 && categories.length >= 2) {
    patterns.push(`${titleize(categories[0] ?? "Tool")} plus ${titleize(categories[1] ?? "tool")} split`);
  }

  return patterns;
}

function topCounts(items: Array<{ label: string; category: string }>): CountRow[] {
  const counts = new Map<string, { count: number; categories: Set<string> }>();

  for (const item of items) {
    const existing = counts.get(item.label) ?? { count: 0, categories: new Set<string>() };
    existing.count += 1;
    existing.categories.add(item.category);
    counts.set(item.label, existing);
  }

  return [...counts.entries()]
    .map(([label, value]) => ({
      label,
      count: value.count,
      categories: [...value.categories].sort()
    }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    .slice(0, 8);
}

function participationGapRead(value: number | null): string {
  if (value == null) return "No diagnostic data provided.";
  if (value >= 80) return "High visible participation with weak owned capture. Strong Rediem education moment.";
  if (value >= 65) return "Meaningful participation is present, but the capture path likely needs a sharper loop.";
  return "Directional opportunity. Use category context before making a strong claim.";
}

function retailBridgeRead(value: number | null): string {
  if (value == null) return "No diagnostic data provided.";
  if (value >= 75) return "Retail reach can become owned profiles through receipt verification and follow-on actions.";
  if (value >= 60) return "Retail signal is useful, but the bridge should be validated before outbound.";
  return "Lower visible retail bridge opportunity in this panel.";
}

function median(values: number[]): number {
  const sorted = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (sorted.length === 0) return 0;
  const midpoint = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[midpoint] as number;
  }

  return ((sorted[midpoint - 1] as number) + (sorted[midpoint] as number)) / 2;
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

function italic(value: string): string {
  return `_${value}_`;
}

function quoteInline(value: string): string {
  return `"${value}"`;
}

function confidenceLabel(confidence: number | null | undefined): string {
  if (confidence == null) return "unknown";
  const pct = `${Math.round(confidence * 100)}%`;
  if (confidence < 0.45) return `${pct} low`;
  if (confidence < 0.65) return `${pct} medium`;
  return `${pct} high`;
}

function formatNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "Unknown";
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

function humanize(value: string): string {
  return value
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => ACRONYMS[part] ?? part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeCategory(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (normalized === "subscription" || normalized === "subscriptions") return "subscriptions";
  if (normalized === "review" || normalized === "reviews") return "reviews";
  if (normalized === "email" || normalized === "crm" || normalized === "email_sms") return "email_sms";
  return normalized;
}

function titleize(value: string): string {
  return humanize(value).toLowerCase();
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())))];
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

export const benchmarkMetricLabels = METRIC_LABELS;

const ACRONYMS: Record<string, string> = {
  crm: "CRM",
  cfr: "CFR",
  dtc: "DTC",
  sms: "SMS",
  ugc: "UGC"
};
