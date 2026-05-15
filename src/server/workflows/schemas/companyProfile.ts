import type { StructuredExtractResult } from "@/server/providers";
import {
  booleanOrNull,
  extractionMetadata,
  jsonSchema,
  nullableBoolean,
  nullableNumber,
  nullableString,
  stringArray,
  stringList,
  stringOrNull
} from "./utils";
import type { CompanyProfileExtract, StructuredSchema } from "./types";

export const companyProfileSchema: StructuredSchema<"companyProfile"> = {
  name: "companyProfile",
  prompt:
    "Extract only visible company profile facts. Use null or empty arrays for unknown fields. Do not infer or fabricate.",
  schema: jsonSchema({
    companyName: nullableString,
    oneLiner: nullableString,
    targetCustomers: stringList,
    productCategories: stringList,
    mainPainPoints: stringList,
    integrations: stringList,
    complianceMentions: stringList,
    securityMentions: stringList,
    enterpriseMotion: nullableBoolean,
    sourceConfidence: nullableNumber
  })
};

export function normalizeCompanyProfileExtract(
  result: StructuredExtractResult,
  provider: string
): CompanyProfileExtract {
  const data = result.data ?? {};

  return {
    ...extractionMetadata(result, provider),
    sourceConfidence:
      typeof data.sourceConfidence === "number"
        ? data.sourceConfidence
        : (result.confidence ?? null),
    companyName: stringOrNull(data.companyName),
    oneLiner: stringOrNull(data.oneLiner),
    targetCustomers: stringArray(data.targetCustomers),
    productCategories: stringArray(data.productCategories),
    mainPainPoints: stringArray(data.mainPainPoints),
    integrations: stringArray(data.integrations),
    complianceMentions: stringArray(data.complianceMentions),
    securityMentions: stringArray(data.securityMentions),
    enterpriseMotion: booleanOrNull(data.enterpriseMotion)
  };
}

