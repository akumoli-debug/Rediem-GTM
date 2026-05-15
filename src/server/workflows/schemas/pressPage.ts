import type { StructuredExtractResult } from "@/server/providers";
import {
  extractionMetadata,
  jsonSchema,
  nullableNumber,
  stringArray,
  stringList
} from "./utils";
import type { PressPageExtract, StructuredSchema } from "./types";

export const pressPageSchema: StructuredSchema<"pressPage"> = {
  name: "pressPage",
  prompt:
    "Extract visible press and news announcements. Unknown fields must be empty arrays. Do not fabricate announcements.",
  schema: jsonSchema({
    recentAnnouncements: stringList,
    fundingMentions: stringList,
    partnerships: stringList,
    executiveHires: stringList,
    expansionMentions: stringList,
    sourceConfidence: nullableNumber
  })
};

export function normalizePressPageExtract(
  result: StructuredExtractResult,
  provider: string
): PressPageExtract {
  const data = result.data ?? {};

  return {
    ...extractionMetadata(result, provider),
    sourceConfidence:
      typeof data.sourceConfidence === "number"
        ? data.sourceConfidence
        : (result.confidence ?? null),
    recentAnnouncements: stringArray(data.recentAnnouncements),
    fundingMentions: stringArray(data.fundingMentions),
    partnerships: stringArray(data.partnerships),
    executiveHires: stringArray(data.executiveHires),
    expansionMentions: stringArray(data.expansionMentions)
  };
}

