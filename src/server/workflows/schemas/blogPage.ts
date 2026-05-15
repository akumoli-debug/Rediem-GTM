import type { StructuredExtractResult } from "@/server/providers";
import {
  extractionMetadata,
  jsonSchema,
  nullableNumber,
  stringArray,
  stringList
} from "./utils";
import type { BlogPageExtract, StructuredSchema } from "./types";

export const blogPageSchema: StructuredSchema<"blogPage"> = {
  name: "blogPage",
  prompt:
    "Extract visible blog/content themes. Unknown fields must be empty arrays. Do not fabricate topics.",
  schema: jsonSchema({
    recentTopics: stringList,
    productThemes: stringList,
    technicalThemes: stringList,
    customerStories: stringList,
    launchMentions: stringList,
    sourceConfidence: nullableNumber
  })
};

export function normalizeBlogPageExtract(
  result: StructuredExtractResult,
  provider: string
): BlogPageExtract {
  const data = result.data ?? {};

  return {
    ...extractionMetadata(result, provider),
    sourceConfidence:
      typeof data.sourceConfidence === "number"
        ? data.sourceConfidence
        : (result.confidence ?? null),
    recentTopics: stringArray(data.recentTopics),
    productThemes: stringArray(data.productThemes),
    technicalThemes: stringArray(data.technicalThemes),
    customerStories: stringArray(data.customerStories),
    launchMentions: stringArray(data.launchMentions)
  };
}

