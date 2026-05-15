import { env } from "@/lib/env";
import { ProviderError } from "./errors";
import type {
  CompanyEnrichmentResult,
  CompanyProvider,
  CompanyProviderInput,
  PeopleProvider,
  PeopleProviderInput,
  PersonResult,
  StructuredExtractResult,
  WebPageResult,
  WebResearchProvider,
  WebSearchResult
} from "./types";

export type MCPResearchProviderOptions = {
  command?: string;
  args?: string[];
  mockResponses?: boolean;
  timeoutMs?: number;
};

export class MCPResearchProvider
  implements CompanyProvider, PeopleProvider, WebResearchProvider
{
  name = "mcp-research-provider";

  private command?: string;
  private args: string[];
  private mockResponses: boolean;
  private timeoutMs: number;

  constructor(options: MCPResearchProviderOptions = {}) {
    this.command = options.command ?? env.mcpResearchServerCommand;
    this.args =
      options.args ??
      env.mcpResearchServerArgs
        ?.split(" ")
        .map((arg) => arg.trim())
        .filter(Boolean) ??
      [];
    this.mockResponses =
      options.mockResponses ?? env.mcpResearchMockResponses === "true";
    this.timeoutMs = options.timeoutMs ?? 30_000;
  }

  async enrichCompany(
    input: CompanyProviderInput
  ): Promise<CompanyEnrichmentResult> {
    if (this.mockResponses) {
      return {
        domain: input.domain,
        name: input.companyName,
        linkedinUrl: input.linkedinUrl,
        websiteSummary:
          "Mock MCP company enrichment. Enable the MCP client implementation to call a configured research server.",
        confidenceScore: 0.5,
        evidence: []
      };
    }

    return this.callMcpTool("company.enrich", input);
  }

  async findPeople(input: PeopleProviderInput): Promise<PersonResult[]> {
    if (this.mockResponses) {
      const people: PersonResult[] = [
        {
          fullName: "Morgan Lee",
          title: "Head of Growth",
          seniority: "Director",
          department: "Growth",
          personaType: "CHAMPION_CANDIDATE",
          roleScore: 76,
          sourceConfidence: 0.55
        }
      ];

      return people.slice(0, input.maxResults ?? 1);
    }

    return this.callMcpTool("people.find", input);
  }

  async scrapePage(url: string): Promise<WebPageResult> {
    if (this.mockResponses) {
      return {
        url,
        statusCode: 200,
        title: "Mock MCP Page",
        text: "Mock MCP scrape response.",
        capturedAt: new Date()
      };
    }

    return this.callMcpTool("web.scrapePage", { url });
  }

  async searchWeb(
    query: string,
    options?: { maxResults?: number }
  ): Promise<WebSearchResult[]> {
    if (this.mockResponses) {
      return [
        {
          title: `Mock MCP search result for ${query}`,
          url: "https://search.example/mock-mcp-result",
          snippet: "Mock MCP web search response.",
          rank: 1,
          source: this.name,
          capturedAt: new Date()
        }
      ].slice(0, options?.maxResults ?? 1);
    }

    return this.callMcpTool("web.search", { query, options });
  }

  async extractStructured(input: {
    url: string;
    schema: object;
    prompt?: string;
  }): Promise<StructuredExtractResult> {
    if (this.mockResponses) {
      return {
        url: input.url,
        schema: input.schema,
        data: {
          summary: input.prompt ?? "Mock MCP structured extraction."
        },
        confidence: 0.5
      };
    }

    return this.callMcpTool("web.extractStructured", input);
  }

  private async callMcpTool(
    toolName: string,
    input: unknown
  ): Promise<never> {
    void input;

    if (!this.command) {
      throw new ProviderError(
        "MCP research provider is not configured. Set MCP_RESEARCH_SERVER_COMMAND or enable mock responses.",
        {
          providerName: this.name,
          code: "PROVIDER_NOT_CONFIGURED"
        }
      );
    }

    // Deferred integration: wire a real MCP client transport here. The adapter intentionally
    // keeps the rest of the app coupled only to provider interfaces.
    throw new ProviderError(
      `MCP tool '${toolName}' is not implemented yet for command '${this.command}'.`,
      {
        providerName: this.name,
        code: "PROVIDER_NOT_IMPLEMENTED",
        cause: {
          command: this.command,
          args: this.args,
          timeoutMs: this.timeoutMs
        }
      }
    );
  }
}
