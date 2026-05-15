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
import type { CareersPageExtract, StructuredSchema } from "./types";

export const careersPageSchema: StructuredSchema<"careersPage"> = {
  name: "careersPage",
  prompt:
    "Extract visible hiring and careers signals. Unknown fields must be null or empty arrays. Do not infer hidden roles.",
  schema: jsonSchema({
    openRoles: stringList,
    departmentsHiring: stringList,
    seniorityHiring: stringList,
    locations: stringList,
    remoteFriendly: nullableBoolean,
    hiringThemes: stringList,
    growthSignal: nullableString,
    sourceConfidence: nullableNumber
  })
};

export function normalizeCareersPageExtract(
  result: StructuredExtractResult,
  provider: string
): CareersPageExtract {
  const data = result.data ?? {};

  return {
    ...extractionMetadata(result, provider),
    sourceConfidence:
      typeof data.sourceConfidence === "number"
        ? data.sourceConfidence
        : (result.confidence ?? null),
    openRoles: stringArray(data.openRoles),
    departmentsHiring: stringArray(data.departmentsHiring),
    seniorityHiring: stringArray(data.seniorityHiring),
    locations: stringArray(data.locations),
    remoteFriendly: booleanOrNull(data.remoteFriendly),
    hiringThemes: stringArray(data.hiringThemes),
    growthSignal: stringOrNull(data.growthSignal)
  };
}

