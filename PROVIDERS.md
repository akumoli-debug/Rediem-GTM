# Providers

GTM Engine uses provider adapters so workflows are not coupled to one research system. App logic depends on typed provider interfaces and normalized outputs.

## Provider Interfaces

Provider types live in `src/server/providers/types.ts`.

Capabilities:

- `CompanyProvider`
- `PeopleProvider`
- `ContactProvider`
- `EmailVerificationProvider`
- `WebResearchProvider`
- `BrowserProvider`

Each provider has a `name` and returns normalized data. Provider-specific raw payloads can be included in `raw` and stored in `ProviderResult` for auditability.

## CompanyProvider

```ts
enrichCompany(input: {
  domain?: string;
  linkedinUrl?: string;
  companyName?: string;
})
```

Returns company profile fields such as name, industry, employee count, summaries, confidence, and evidence.

## PeopleProvider

```ts
findPeople(input: {
  domain?: string;
  linkedinCompanyUrl?: string;
  roleHints?: string[];
  maxResults?: number;
})
```

Returns possible buying committee members with names, titles, profile URLs, optional emails, persona hints, role scores, and evidence.

## ContactProvider

```ts
enrichContact(input: {
  fullName: string;
  companyDomain: string;
  linkedinUrl?: string;
})
```

Returns contact details such as email, phone, email status, contactability score, confidence, and evidence.

## EmailVerificationProvider

```ts
verifyEmail(input: {
  email: string;
})
```

Returns one of:

- `UNKNOWN`
- `VERIFIED`
- `RISKY`
- `CATCH_ALL`
- `INVALID`
- `SUPPRESSED`

Only `VERIFIED` should be treated as outbound-ready.

## WebResearchProvider

```ts
scrapePage(url: string)
searchWeb(query: string, options?: { maxResults?: number })
extractStructured(input: { url: string; schema: object; prompt?: string })
```

Used by account research to inspect key website pages, search recent events, and extract structured GTM intelligence.

## BrowserProvider

```ts
inspectStyles(input: {
  url: string;
  selector?: string;
})
```

Used for browser/style inspection tasks where visual or CSS data is needed.

## Provider Registry

`ProviderRegistry` can register providers by capability and retrieve them by capability. It throws typed provider errors when a required provider is missing.

## Built-In Adapters

- `MockProvider`: deterministic local provider for development, tests, CI, and evals.
- `MCPResearchProvider`: generic adapter for a configured external MCP research provider command.
- CRM provider stubs: HubSpot and Salesforce classes define the shape for future API-backed sync.

## Caching

Use `withCache` for expensive provider calls. Cache namespaces include:

- `company_enrichment`
- `people_lookup`
- `contact_enrichment`
- `email_verification`
- `web_scrape`
- `web_search`
- `structured_extract`
- `browser_styles`

Provider cache hits are logged as `ProviderResult.status = CACHED`.

## Provider Results

Every provider call should record:

- Provider name
- Tool name
- Input hash
- Raw response when safe
- Normalized response
- Cost
- Latency
- Status
- Error message when failed

Avoid logging secrets or private credentials.

## Live Providers

Local and CI runs use mock providers by default. Live provider evaluation is opt-in. Configure environment variables, then explicitly run with the relevant live flag or provider setting.
