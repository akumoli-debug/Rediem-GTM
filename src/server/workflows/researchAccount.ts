import {
  createSignalWithEvidence,
  upsertAccountWithEvidence,
  type EvidenceClient,
  type EnrichedField
} from "@/server/evidence";
import {
  calculateAccountScore,
  scoreSignal,
  type ScoredSignal,
  type SignalSourceCategory,
  type SignalType
} from "@/server/scoring/signals";
import { maybeEvaluateFormulasAfterEntityEnrichment } from "@/server/formulas";
import {
  withCache,
  type CacheEntryClient,
  type ProviderCacheNamespace
} from "@/server/cache";
import {
  getPlaybookForWorkflow,
  playbookMotion,
  type PlaybookClient
} from "@/server/playbooks";
import {
  blogPageSchema,
  careersPageSchema,
  normalizeBlogPageExtract,
  normalizeCareersPageExtract,
  normalizePressPageExtract,
  normalizePricingPageExtract,
  normalizeWebsiteRootExtract,
  pressPageSchema,
  pricingPageSchema,
  websiteRootSchema,
  type BlogPageExtract,
  type CareersPageExtract,
  type PressPageExtract,
  type PricingPageExtract,
  type StructuredSchema,
  type WebsiteRootExtract
} from "./schemas";
import { redactSensitiveValue } from "@/server/providers/redaction";
import type {
  CompanyEnrichmentResult,
  CompanyProvider,
  StructuredExtractResult,
  WebPageResult,
  WebResearchProvider,
  WebSearchResult
} from "@/server/providers";

type ProviderResultStatus = "SUCCESS" | "PARTIAL" | "FAILED" | "CACHED";

type ProviderResultRecord = {
  id?: string;
  workspaceId: string;
  workflowRunId?: string | null;
  provider: string;
  toolName: string;
  inputHash: string;
  rawResponse?: unknown;
  normalizedResponse?: unknown;
  costUsd?: number | string | null;
  latencyMs?: number | null;
  status: ProviderResultStatus;
  errorMessage?: string | null;
  createdAt?: Date;
};

export type ResearchAccountClient = EvidenceClient & CacheEntryClient & PlaybookClient & {
  providerResult: {
    create(args: { data: ProviderResultRecord }): Promise<ProviderResultRecord>;
  };
};

export type ResearchAccountInput = {
  workspaceId: string;
  domain: string;
  focus?: string;
  playbookId?: string;
  maxCostUsd?: number;
  forceRefresh?: boolean;
};

export type ResearchAccountProviders = {
  company: CompanyProvider;
  webResearch: WebResearchProvider;
};

type ExtractedWebsiteResearch = {
  oneLiner?: string;
  targetCustomers: string[];
  productCategories: string[];
  mainPainPoints: string[];
  pricingModel?: string;
  hasEnterprisePlan?: boolean;
  openRoles: string[];
  hiringThemes: string[];
  complianceMentions: string[];
  securityMentions: string[];
  integrations: string[];
  impliedPainPoints: string[];
};

type PageResearchResult = {
  page: WebsitePage;
  url: string;
  scrape: WebPageResult;
  extraction: StructuredExtractResult;
  normalized: PageNormalizedExtract;
};

type ResearchSignal = {
  type: SignalType;
  title: string;
  description?: string;
  sourceUrl?: string;
  signalDate?: Date;
  sourceCategory?: SignalSourceCategory;
};

export type ResearchAccountDossier = {
  workspaceId: string;
  playbookId?: string;
  playbookName?: string;
  domain: string;
  accountId: string;
  accountName: string;
  cached: boolean;
  accountScore: number;
  confidenceScore: number;
  oneLiner?: string;
  targetCustomers: string[];
  productCategories: string[];
  pricingModel?: string;
  hasEnterprisePlan?: boolean;
  openRoles: string[];
  hiringThemes: string[];
  complianceMentions: string[];
  integrations: string[];
  impliedPainPoints: string[];
  signals: Array<{
    type: ResearchSignal["type"];
    title: string;
    sourceUrl?: string;
    totalScore: number;
  }>;
  sourceUrls: string[];
  providerCalls: number;
  totalCostUsd: number;
};

type WebsitePage = "root" | "about" | "pricing" | "careers" | "blog" | "press";
type PageNormalizedExtract =
  | WebsiteRootExtract
  | PricingPageExtract
  | CareersPageExtract
  | BlogPageExtract
  | PressPageExtract;

const CACHE_NAMESPACE = "workflow:research-account";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const PAGE_CONCURRENCY = 3;

const COSTS = {
  companyEnrich: 0.02,
  scrapePage: 0.005,
  extractStructured: 0.01,
  searchWeb: 0.01
};

const WEBSITE_PAGES: Array<{ page: WebsitePage; path: string }> = [
  { page: "root", path: "/" },
  { page: "about", path: "/about" },
  { page: "pricing", path: "/pricing" },
  { page: "careers", path: "/careers" },
  { page: "blog", path: "/blog" },
  { page: "press", path: "/press" }
];

export async function researchAccount(
  client: ResearchAccountClient,
  providers: ResearchAccountProviders,
  input: ResearchAccountInput
): Promise<ResearchAccountDossier> {
  const playbook = await getPlaybookForWorkflow(client, input);
  const focus = playbookMotion(playbook, input.focus);
  const domain = canonicalizeDomain(input.domain);
  const cacheKey = `${input.workspaceId}:${domain}:${focus ?? "default"}:${input.playbookId ?? "no-playbook"}`;
  const cached = input.forceRefresh ? null : await getCachedDossier(client, cacheKey);

  if (cached) {
    await recordProviderResult(client, {
      workspaceId: input.workspaceId,
      provider: "cache",
      toolName: "researchAccount.cache",
      inputHash: cacheKey,
      normalizedResponse: cached,
      costUsd: 0,
      latencyMs: 0,
      status: "CACHED"
    });

    return {
      ...cached,
      cached: true,
      providerCalls: cached.providerCalls + 1
    };
  }

  const costGuard = createCostGuard(input.maxCostUsd);
  const company = await callProvider(client, costGuard, {
    workspaceId: input.workspaceId,
    provider: providers.company.name,
    toolName: "CompanyProvider.enrichCompany",
    cacheNamespace: "company_enrichment",
    input: { domain },
    estimatedCostUsd: COSTS.companyEnrich,
    forceRefresh: input.forceRefresh,
    call: () => providers.company.enrichCompany({ domain })
  });

  const pageResults = await mapWithConcurrency(
    WEBSITE_PAGES,
    PAGE_CONCURRENCY,
    ({ page, path }) =>
      researchWebsitePage(
        client,
        providers,
        costGuard,
        input.workspaceId,
        domain,
        page,
        path,
        input.forceRefresh
      )
  );

  const webEvents = await callProvider(client, costGuard, {
    workspaceId: input.workspaceId,
    provider: providers.webResearch.name,
    toolName: "WebResearchProvider.searchWeb",
    cacheNamespace: "web_search",
    input: {
      query: `${company.name ?? domain} recent company events funding launch pricing compliance expansion news ${
        focus ?? ""
      }`.trim(),
      maxResults: 5
    },
    estimatedCostUsd: COSTS.searchWeb,
    forceRefresh: input.forceRefresh,
    call: () =>
      providers.webResearch.searchWeb(
        `${company.name ?? domain} recent company events funding launch pricing compliance expansion news ${
          focus ?? ""
        }`.trim(),
        { maxResults: 5 }
      )
  });

  const extracted = mergeWebsiteExtractions(pageResults);
  const confidenceScore = computeConfidenceScore(company, pageResults, webEvents);
  const companyFitScore = computeCompanyFitScore(company, extracted);
  const signals = deriveSignals(extracted, webEvents, {
    focus,
    now: new Date()
  });
  const accountScore = calculateAccountScore({
    signals,
    companyFitScore,
    evidenceConfidence: confidenceScore * 100
  });
  const sourceUrls = collectSourceUrls(company, pageResults, webEvents);
  const account = await upsertAccountWithEvidence(client, {
    workspaceId: input.workspaceId,
    overwritePolicy: "HIGHER_CONFIDENCE",
    fields: buildAccountFields({
      domain,
      company,
      extracted,
      accountScore,
      confidenceScore,
      sourceUrl: sourceUrls[0],
      provider: providers.company.name
    })
  });
  await maybeEvaluateFormulasAfterEntityEnrichment(client, {
    workspaceId: input.workspaceId,
    entityType: "ACCOUNT",
    entityId: account.id
  });

  const createdSignals = await Promise.all(
    signals.map((signal) =>
      createSignalWithEvidence(client, {
        workspaceId: input.workspaceId,
        accountId: account.id,
        fields: buildSignalFields(signal, providers.webResearch.name)
      })
    )
  );

  const dossier: ResearchAccountDossier = {
    workspaceId: input.workspaceId,
    playbookId: playbook?.id,
    playbookName: playbook?.name,
    domain,
    accountId: account.id,
    accountName: account.name,
    cached: false,
    accountScore,
    confidenceScore,
    oneLiner: extracted.oneLiner,
    targetCustomers: extracted.targetCustomers,
    productCategories: extracted.productCategories,
    pricingModel: extracted.pricingModel,
    hasEnterprisePlan: extracted.hasEnterprisePlan,
    openRoles: extracted.openRoles,
    hiringThemes: extracted.hiringThemes,
    complianceMentions: extracted.complianceMentions,
    integrations: extracted.integrations,
    impliedPainPoints: extracted.impliedPainPoints,
    signals: createdSignals.map((signal) => ({
      type: signal.type as ResearchSignal["type"],
      title: signal.title,
      sourceUrl: signal.sourceUrl ?? undefined,
      totalScore: signal.totalScore ?? 0
    })),
    sourceUrls,
    providerCalls: 1 + pageResults.length * 2 + 1,
    totalCostUsd: costGuard.totalCostUsd()
  };

  await cacheDossier(client, cacheKey, dossier);

  return dossier;
}

export function canonicalizeDomain(input: string): string {
  const withProtocol = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  const url = new URL(withProtocol);

  return url.hostname.replace(/^www\./i, "").toLowerCase();
}

async function researchWebsitePage(
  client: ResearchAccountClient,
  providers: ResearchAccountProviders,
  costGuard: CostGuard,
  workspaceId: string,
  domain: string,
  page: WebsitePage,
  path: string,
  forceRefresh?: boolean
): Promise<PageResearchResult> {
  const url = `https://${domain}${path}`;
  const schema = schemaForWebsitePage(page);
  const scrape = await callProvider(client, costGuard, {
    workspaceId,
    provider: providers.webResearch.name,
    toolName: "WebResearchProvider.scrapePage",
    cacheNamespace: "web_scrape",
    input: { url },
    estimatedCostUsd: COSTS.scrapePage,
    forceRefresh,
    call: () => providers.webResearch.scrapePage(url)
  });
  const extraction = await callProvider(client, costGuard, {
    workspaceId,
    provider: providers.webResearch.name,
    toolName: "WebResearchProvider.extractStructured",
    cacheNamespace: "structured_extract",
    input: {
      url,
      schema: schema.schema
    },
    estimatedCostUsd: COSTS.extractStructured,
    forceRefresh,
    call: () =>
      providers.webResearch.extractStructured({
        url,
        schema: schema.schema,
        prompt: schema.prompt
      })
  });

  return {
    page,
    url,
    scrape,
    extraction,
    normalized: normalizeWebsitePageExtraction(page, extraction, providers.webResearch.name)
  };
}

async function callProvider<TResult>(
  client: ResearchAccountClient,
  costGuard: CostGuard,
  input: {
    workspaceId: string;
    provider: string;
    toolName: string;
    cacheNamespace: ProviderCacheNamespace;
    input: unknown;
    estimatedCostUsd: number;
    forceRefresh?: boolean;
    call: () => Promise<TResult>;
  }
): Promise<TResult> {
  try {
    const cached = await withCache(client, {
      workspaceId: input.workspaceId,
      namespace: input.cacheNamespace,
      provider: input.provider,
      toolName: input.toolName,
      providerInput: input.input,
      forceRefresh: input.forceRefresh,
      recordProviderResult: (result) => recordProviderResult(client, result),
      call: async () => {
        costGuard.reserve(input.estimatedCostUsd, input.toolName);
        return input.call();
      }
    });

    if (!cached.cached) {
      await recordProviderResult(client, {
        workspaceId: input.workspaceId,
        provider: input.provider,
        toolName: input.toolName,
        inputHash: cached.inputHash,
        rawResponse: cached.value,
        normalizedResponse: cached.value,
        costUsd: input.estimatedCostUsd,
        latencyMs: cached.latencyMs,
        status: "SUCCESS"
      });
    }

    return cached.value;
  } catch (error) {
    await recordProviderResult(client, {
      workspaceId: input.workspaceId,
      provider: input.provider,
      toolName: input.toolName,
      inputHash: stableHash(input.input),
      costUsd: input.estimatedCostUsd,
      latencyMs: null,
      status: "FAILED",
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

async function recordProviderResult(
  client: ResearchAccountClient,
  data: ProviderResultRecord
): Promise<void> {
  await client.providerResult.create({
    data: {
      ...data,
      rawResponse: toJsonCompatible(redactSensitiveValue(data.rawResponse)),
      normalizedResponse: toJsonCompatible(redactSensitiveValue(data.normalizedResponse)),
      workspaceId: data.workspaceId || "unknown"
    }
  });
}

function buildAccountFields(input: {
  domain: string;
  company: CompanyEnrichmentResult;
  extracted: ExtractedWebsiteResearch;
  accountScore: number;
  confidenceScore: number;
  sourceUrl?: string;
  provider: string;
}): Record<string, EnrichedField<string | number>> {
  const capturedAt = new Date();
  const field = <T extends string | number>(
    value: T | null | undefined,
    confidence = input.confidenceScore
  ): EnrichedField<T> => ({
    value,
    sourceUrl: input.sourceUrl,
    provider: input.provider,
    confidence,
    capturedAt
  });

  return {
    domain: field(input.domain, 1),
    name: field(input.company.name ?? titleizeDomain(input.domain)),
    linkedinUrl: field(input.company.linkedinUrl),
    industry: field(input.company.industry),
    employeeCount: field(input.company.employeeCount),
    hqLocation: field(input.company.hqLocation),
    websiteSummary: field(input.extracted.oneLiner ?? input.company.websiteSummary),
    pricingSummary: field(input.extracted.pricingModel ?? input.company.pricingSummary),
    careersSummary: field(summaryFromList(input.extracted.hiringThemes) ?? input.company.careersSummary),
    blogSummary: field(summaryFromList(input.extracted.productCategories) ?? input.company.blogSummary),
    pressSummary: field(input.company.pressSummary),
    accountScore: field(input.accountScore, input.confidenceScore),
    confidenceScore: field(input.confidenceScore, input.confidenceScore)
  };
}

function buildSignalFields(
  signal: ScoredSignal,
  provider: string
): {
  type: EnrichedField<string>;
  title: EnrichedField<string>;
  description?: EnrichedField<string>;
  freshnessScore: EnrichedField<number>;
  relevanceScore: EnrichedField<number>;
  sourceQualityScore: EnrichedField<number>;
  totalScore: EnrichedField<number>;
  sourceUrl?: EnrichedField<string>;
} {
  const capturedAt = new Date();
  const evidence = <T extends string | number>(
    value: T | null | undefined,
    confidence = 0.75
  ): EnrichedField<T> => ({
    value,
    sourceUrl: signal.sourceUrl,
    provider,
    confidence,
    capturedAt,
    rawExcerpt: signal.description
  });

  return {
    type: evidence(signal.type),
    title: evidence(signal.title),
    description: evidence(signal.description),
    freshnessScore: evidence(signal.freshnessScore),
    relevanceScore: evidence(signal.relevanceScore),
    sourceQualityScore: evidence(signal.sourceQualityScore),
    totalScore: evidence(signal.totalScore),
    sourceUrl: evidence(signal.sourceUrl)
  };
}

function mergeWebsiteExtractions(
  pageResults: PageResearchResult[]
): ExtractedWebsiteResearch {
  const companyProfiles = pageResults.flatMap((result) =>
    result.page === "root" || result.page === "about"
      ? [result.normalized as WebsiteRootExtract]
      : []
  );
  const pricing = firstPage<PricingPageExtract>(pageResults, "pricing");
  const careers = firstPage<CareersPageExtract>(pageResults, "careers");
  const blog = firstPage<BlogPageExtract>(pageResults, "blog");

  return {
    oneLiner: companyProfiles.map((item) => item.oneLiner).find(Boolean) ?? undefined,
    targetCustomers: uniqueStrings(companyProfiles.flatMap((item) => item.targetCustomers)),
    productCategories: uniqueStrings([
      ...companyProfiles.flatMap((item) => item.productCategories),
      ...(blog?.productThemes ?? [])
    ]),
    mainPainPoints: uniqueStrings(companyProfiles.flatMap((item) => item.mainPainPoints)),
    pricingModel: pricing?.pricingModel ?? undefined,
    hasEnterprisePlan:
      pricing?.hasEnterprisePlan ?? companyProfiles[0]?.enterpriseMotion ?? undefined,
    openRoles: careers?.openRoles ?? [],
    hiringThemes: uniqueStrings([
      ...(careers?.hiringThemes ?? []),
      ...(careers?.departmentsHiring ?? []),
      ...(careers?.growthSignal ? [careers.growthSignal] : [])
    ]),
    complianceMentions: uniqueStrings(
      companyProfiles.flatMap((item) => item.complianceMentions)
    ),
    securityMentions: uniqueStrings(
      companyProfiles.flatMap((item) => item.securityMentions)
    ),
    integrations: uniqueStrings(companyProfiles.flatMap((item) => item.integrations)),
    impliedPainPoints: uniqueStrings([
      ...companyProfiles.flatMap((item) => item.mainPainPoints),
      ...(pricing?.buyerSegment ? [`Buyer segment: ${pricing.buyerSegment}`] : []),
      ...(blog?.technicalThemes ?? [])
    ])
  };
}

function deriveSignals(
  extracted: ExtractedWebsiteResearch,
  webEvents: WebSearchResult[],
  options: {
    focus?: string;
    now: Date;
  }
): ScoredSignal[] {
  const signals: ResearchSignal[] = [];

  if (extracted.openRoles.length > 0 || extracted.hiringThemes.length > 0) {
    signals.push({
      type: "HIRING",
      title: "Hiring activity detected",
      description: [...extracted.hiringThemes, ...extracted.openRoles]
        .slice(0, 6)
        .join("; "),
      signalDate: options.now,
      sourceCategory: "COMPANY_CAREERS"
    });
  }

  if (extracted.pricingModel || extracted.hasEnterprisePlan !== undefined) {
    signals.push({
      type: "PRICING_CHANGE",
      title: "Pricing motion identified",
      description: [
        extracted.pricingModel,
        extracted.hasEnterprisePlan ? "Enterprise plan present" : undefined
      ]
        .filter(Boolean)
        .join("; "),
      signalDate: options.now,
      sourceCategory: "COMPANY_WEBSITE"
    });
  }

  if (extracted.complianceMentions.length > 0 || extracted.securityMentions.length > 0) {
    signals.push({
      type: "COMPLIANCE",
      title: "Compliance requirements mentioned",
      description: [...extracted.complianceMentions, ...extracted.securityMentions]
        .slice(0, 5)
        .join("; "),
      signalDate: options.now,
      sourceCategory: "COMPANY_WEBSITE"
    });
  }

  for (const event of webEvents.slice(0, 5)) {
    const text = `${event.title} ${event.snippet ?? ""}`.toLowerCase();
    const type = classifyEventSignal(text);

    signals.push({
      type,
      title: event.title,
      description: event.snippet,
      sourceUrl: event.url,
      signalDate: event.capturedAt,
      sourceCategory: event.source === "mock-provider" ? "GENERIC_WEB" : undefined
    });
  }

  return dedupeSignals(signals).map((signal) =>
    scoreSignal(signal, {
      focus: options.focus,
      now: options.now
    })
  );
}

function classifyEventSignal(text: string): ResearchSignal["type"] {
  if (text.includes("funding") || text.includes("raised")) {
    return "FUNDING";
  }

  if (text.includes("launch") || text.includes("released")) {
    return "PRODUCT_LAUNCH";
  }

  if (text.includes("pricing") || text.includes("plan")) {
    return "PRICING_CHANGE";
  }

  if (text.includes("compliance") || text.includes("security")) {
    return "COMPLIANCE";
  }

  if (text.includes("expansion") || text.includes("new market")) {
    return "EXPANSION";
  }

  return "NEWS";
}

function computeCompanyFitScore(
  company: CompanyEnrichmentResult,
  extracted: ExtractedWebsiteResearch
): number {
  const completeness = [
    company.industry,
    company.employeeCount,
    extracted.oneLiner,
    extracted.targetCustomers.length,
    extracted.productCategories.length,
    extracted.pricingModel,
    extracted.openRoles.length
  ].filter(Boolean).length;

  return Math.min(100, Math.round(45 + completeness * 8));
}

function computeConfidenceScore(
  company: CompanyEnrichmentResult,
  pageResults: PageResearchResult[],
  webEvents: WebSearchResult[]
): number {
  const extractionConfidence = average(
    pageResults
      .map((result) => result.normalized.sourceConfidence)
      .filter((value): value is number => typeof value === "number")
  );
  const companyConfidence = company.confidenceScore ?? 0.6;
  const webConfidence = webEvents.length > 0 ? 0.7 : 0.4;

  return roundToTwoDecimals(
    average([companyConfidence, extractionConfidence ?? 0.55, webConfidence]) ??
      0
  );
}

function collectSourceUrls(
  company: CompanyEnrichmentResult,
  pageResults: PageResearchResult[],
  webEvents: WebSearchResult[]
): string[] {
  return uniqueStrings([
    ...(company.evidence?.map((item) => item.sourceUrl).filter(Boolean) ?? []),
    ...pageResults.map((result) => result.url),
    ...webEvents.map((event) => event.url)
  ]);
}

function schemaForWebsitePage(page: WebsitePage): StructuredSchema {
  switch (page) {
    case "root":
    case "about":
      return websiteRootSchema;
    case "pricing":
      return pricingPageSchema;
    case "careers":
      return careersPageSchema;
    case "blog":
      return blogPageSchema;
    case "press":
      return pressPageSchema;
  }
}

function normalizeWebsitePageExtraction(
  page: WebsitePage,
  extraction: StructuredExtractResult,
  provider: string
): PageNormalizedExtract {
  switch (page) {
    case "root":
    case "about":
      return normalizeWebsiteRootExtract(extraction, provider);
    case "pricing":
      return normalizePricingPageExtract(extraction, provider);
    case "careers":
      return normalizeCareersPageExtract(extraction, provider);
    case "blog":
      return normalizeBlogPageExtract(extraction, provider);
    case "press":
      return normalizePressPageExtract(extraction, provider);
  }
}

async function getCachedDossier(
  client: ResearchAccountClient,
  key: string
): Promise<ResearchAccountDossier | null> {
  const row = await client.cacheEntry.findFirst({
    where: {
      namespace: CACHE_NAMESPACE,
      key
    }
  });

  if (!row || (row.expiresAt && new Date(row.expiresAt).getTime() <= Date.now())) {
    return null;
  }

  return row.value as ResearchAccountDossier;
}

async function cacheDossier(
  client: ResearchAccountClient,
  key: string,
  dossier: ResearchAccountDossier
): Promise<void> {
  await client.cacheEntry.upsert({
    where: {
      namespace_key: {
        namespace: CACHE_NAMESPACE,
        key
      }
    },
    create: {
      namespace: CACHE_NAMESPACE,
      key,
      value: dossier,
      expiresAt: new Date(Date.now() + CACHE_TTL_MS)
    },
    update: {
      value: dossier,
      expiresAt: new Date(Date.now() + CACHE_TTL_MS)
    }
  });
}

type CostGuard = {
  reserve(costUsd: number, label: string): void;
  totalCostUsd(): number;
};

function createCostGuard(maxCostUsd: number | undefined): CostGuard {
  let total = 0;

  return {
    reserve(costUsd, label) {
      if (maxCostUsd !== undefined && total + costUsd > maxCostUsd) {
        throw new Error(
          `Cost limit exceeded before ${label}: ${roundToFourDecimals(
            total + costUsd
          )} > ${maxCostUsd}`
        );
      }

      total += costUsd;
    },
    totalCostUsd() {
      return roundToFourDecimals(total);
    }
  };
}

async function mapWithConcurrency<TInput, TOutput>(
  inputs: TInput[],
  concurrency: number,
  mapper: (input: TInput, index: number) => Promise<TOutput>
): Promise<TOutput[]> {
  const results = new Array<TOutput>(inputs.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < inputs.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(inputs[currentIndex] as TInput, currentIndex);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, inputs.length) }, () => worker())
  );

  return results;
}

function firstPage<TExtract extends PageNormalizedExtract>(
  pageResults: PageResearchResult[],
  page: WebsitePage
): TExtract | undefined {
  return pageResults.find((result) => result.page === page)?.normalized as
    | TExtract
    | undefined;
}

function dedupeSignals(signals: ResearchSignal[]): ResearchSignal[] {
  const seen = new Set<string>();

  return signals.filter((signal) => {
    const key = `${signal.type}:${signal.title.toLowerCase()}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function summaryFromList(items: string[]): string | undefined {
  return items.length > 0 ? items.slice(0, 5).join("; ") : undefined;
}

function titleizeDomain(domain: string): string {
  return domain
    .split(".")[0]
    ?.split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") ?? domain;
}

function stableHash(value: unknown): string {
  const json = stableStringify(value);
  let hash = 0;

  for (let index = 0; index < json.length; index += 1) {
    hash = (hash * 31 + json.charCodeAt(index)) >>> 0;
  }

  return hash.toString(16);
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortJsonValue(value));
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue);
  }

  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortJsonValue(child)])
    );
  }

  return value;
}

function toJsonCompatible(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(
    JSON.stringify(value, (_key, child) =>
      child instanceof Date ? child.toISOString() : child
    )
  ) as unknown;
}

function uniqueStrings(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function average(values: number[]): number | undefined {
  if (values.length === 0) {
    return undefined;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundToFourDecimals(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}
