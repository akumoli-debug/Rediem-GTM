import type {
  BrowserProvider,
  CompanyEnrichmentResult,
  CompanyProvider,
  CompanyProviderInput,
  ContactProvider,
  ContactProviderInput,
  ContactResult,
  EmailVerificationProvider,
  EmailVerificationProviderInput,
  EmailVerificationResult,
  PeopleProvider,
  PeopleProviderInput,
  PersonResult,
  StructuredExtractResult,
  StyleInspectionResult,
  WebPageResult,
  WebResearchProvider,
  WebSearchResult
} from "./types";

export class MockProvider
  implements
    CompanyProvider,
    PeopleProvider,
    ContactProvider,
    EmailVerificationProvider,
    WebResearchProvider,
    BrowserProvider
{
  name = "mock-provider";

  async enrichCompany(
    input: CompanyProviderInput
  ): Promise<CompanyEnrichmentResult> {
    const domain = input.domain ?? "sample.example";

    return {
      domain,
      name: input.companyName ?? "Sample Company",
      linkedinUrl:
        input.linkedinUrl ?? "https://www.linkedin.com/company/sample-company",
      industry: "B2B Software",
      employeeCount: 250,
      hqLocation: "San Francisco, CA",
      websiteSummary:
        "Sample company profile generated for local development.",
      pricingSummary: "Pricing appears to be sales-assisted.",
      careersSummary: "Hiring suggests investment in revenue and engineering.",
      blogSummary: "Recent content focuses on operational efficiency.",
      pressSummary: "Recent announcements indicate product expansion.",
      confidenceScore: 0.8,
      evidence: [
        {
          sourceUrl: `https://${domain}`,
          provider: this.name,
          rawExcerpt: "Mock company enrichment evidence.",
          confidence: 0.8,
          capturedAt: new Date()
        }
      ]
    };
  }

  async findPeople(input: PeopleProviderInput): Promise<PersonResult[]> {
    const maxResults = input.maxResults ?? 2;
    const people: PersonResult[] = [
      {
        fullName: "Avery Johnson",
        title: "VP of Revenue Operations",
        seniority: "Executive",
        department: "Revenue",
        linkedinUrl: "https://www.linkedin.com/in/avery-johnson-sample",
        email: input.domain ? `avery@${input.domain}` : undefined,
        personaType: "DAY_TO_DAY_OWNER",
        roleScore: 84,
        sourceConfidence: 0.78
      },
      {
        fullName: "Riley Chen",
        title: "Chief Technology Officer",
        seniority: "C-Level",
        department: "Engineering",
        linkedinUrl: "https://www.linkedin.com/in/riley-chen-sample",
        email: input.domain ? `riley@${input.domain}` : undefined,
        personaType: "TECHNICAL_BUYER",
        roleScore: 91,
        sourceConfidence: 0.74
      }
    ];

    return people.slice(0, maxResults);
  }

  async enrichContact(input: ContactProviderInput): Promise<ContactResult> {
    return {
      fullName: input.fullName,
      companyDomain: input.companyDomain,
      linkedinUrl: input.linkedinUrl,
      email: `${input.fullName.toLowerCase().replaceAll(" ", ".")}@${
        input.companyDomain
      }`,
      emailStatus: "UNKNOWN",
      contactabilityScore: 70,
      sourceConfidence: 0.65
    };
  }

  async verifyEmail(
    input: EmailVerificationProviderInput
  ): Promise<EmailVerificationResult> {
    return {
      email: input.email,
      status: input.email.includes("@") ? "VERIFIED" : "INVALID",
      confidence: input.email.includes("@") ? 0.9 : 0.95,
      reason: "Mock verification result."
    };
  }

  async scrapePage(url: string): Promise<WebPageResult> {
    return {
      url,
      statusCode: 200,
      title: "Mock Page",
      text: "Mock page content for local development.",
      capturedAt: new Date()
    };
  }

  async searchWeb(
    query: string,
    options?: { maxResults?: number }
  ): Promise<WebSearchResult[]> {
    const maxResults = options?.maxResults ?? 3;

    return Array.from({ length: maxResults }, (_, index) => ({
      title: `Mock result ${index + 1} for ${query}`,
      url: `https://search.example/results/${index + 1}`,
      snippet: "Mock search result snippet.",
      rank: index + 1,
      source: this.name,
      capturedAt: new Date()
    }));
  }

  async extractStructured(input: {
    url: string;
    schema: object;
    prompt?: string;
  }): Promise<StructuredExtractResult> {
    return {
      url: input.url,
      schema: input.schema,
      data: {
        summary: input.prompt ?? "Mock structured extraction."
      },
      confidence: 0.7
    };
  }

  async inspectStyles(input: {
    url: string;
    selector?: string;
  }): Promise<StyleInspectionResult> {
    return {
      url: input.url,
      selector: input.selector,
      computedStyles: {
        color: "rgb(24, 32, 47)",
        fontFamily: "Arial, Helvetica, sans-serif"
      },
      matchedElementCount: 1,
      capturedAt: new Date()
    };
  }
}
