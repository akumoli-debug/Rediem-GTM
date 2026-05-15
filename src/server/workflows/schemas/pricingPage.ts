import type { StructuredExtractResult } from "@/server/providers";
import {
  booleanOrNull,
  extractionMetadata,
  jsonSchema,
  nullableBoolean,
  nullableNumber,
  nullableString,
  objectArray,
  stringOrNull
} from "./utils";
import type { PricingPageExtract, StructuredSchema } from "./types";

export const pricingPageSchema: StructuredSchema<"pricingPage"> = {
  name: "pricingPage",
  prompt:
    "Extract only visible pricing information. Unknown or hidden fields must be null or empty arrays. Do not infer pricing that is not visible.",
  schema: jsonSchema({
    plans: {
      type: "array",
      default: [],
      items: jsonSchema({
        name: nullableString,
        price: nullableString,
        description: nullableString
      })
    },
    hasFreePlan: nullableBoolean,
    hasEnterprisePlan: nullableBoolean,
    pricingModel: nullableString,
    usageBased: nullableBoolean,
    salesLed: nullableBoolean,
    selfServe: nullableBoolean,
    buyerSegment: nullableString,
    sourceConfidence: nullableNumber
  })
};

export function normalizePricingPageExtract(
  result: StructuredExtractResult,
  provider: string
): PricingPageExtract {
  const data = result.data ?? {};

  return {
    ...extractionMetadata(result, provider),
    sourceConfidence:
      typeof data.sourceConfidence === "number"
        ? data.sourceConfidence
        : (result.confidence ?? null),
    plans: objectArray(data.plans).map((plan) => ({
      name: stringOrNull(plan.name),
      price: stringOrNull(plan.price),
      description: stringOrNull(plan.description)
    })),
    hasFreePlan: booleanOrNull(data.hasFreePlan),
    hasEnterprisePlan: booleanOrNull(data.hasEnterprisePlan),
    pricingModel: stringOrNull(data.pricingModel),
    usageBased: booleanOrNull(data.usageBased),
    salesLed: booleanOrNull(data.salesLed),
    selfServe: booleanOrNull(data.selfServe),
    buyerSegment: stringOrNull(data.buyerSegment)
  };
}

