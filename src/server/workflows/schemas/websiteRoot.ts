import type { StructuredExtractResult } from "@/server/providers";
import {
  companyProfileSchema,
  normalizeCompanyProfileExtract
} from "./companyProfile";
import type { StructuredSchema, WebsiteRootExtract } from "./types";

export const websiteRootSchema: StructuredSchema<"websiteRoot"> = {
  ...companyProfileSchema,
  name: "websiteRoot",
  prompt:
    "Extract visible homepage/root website GTM intelligence. Use null or empty arrays for unknown fields. Do not infer or fabricate."
};

export function normalizeWebsiteRootExtract(
  result: StructuredExtractResult,
  provider: string
): WebsiteRootExtract {
  return normalizeCompanyProfileExtract(result, provider);
}

