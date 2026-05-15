import type {
  CompanyEnrichmentResult,
  CompanyProvider,
  CompanyProviderInput
} from "@/server/providers";

export async function runAccountEnrichmentWorkflow(
  provider: CompanyProvider,
  input: CompanyProviderInput
): Promise<CompanyEnrichmentResult> {
  return provider.enrichCompany(input);
}

export * from "./researchAccount";
export * from "./analyzeBrandForRediem";
export * from "./resolveBuyingCommittee";
export * from "./resolveRediemBuyingCommittee";
export * from "./generateRediemActivationIdeas";
export * from "./enrichContacts";
export * from "./outreachAngles";
export * from "./tracking";
export * from "./waterfall";
