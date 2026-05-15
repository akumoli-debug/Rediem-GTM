import type { StructuredExtractResult } from "@/server/providers";
import type { ExtractionMetadata } from "./types";

export function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function booleanOrNull(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

export function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

export function objectArray(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is Record<string, unknown> =>
      typeof item === "object" && item !== null && !Array.isArray(item)
  );
}

export function extractionMetadata(
  result: StructuredExtractResult,
  provider: string
): ExtractionMetadata {
  return {
    sourceUrl: result.url,
    provider,
    sourceConfidence: numberOrNull(result.confidence)
  };
}

export function jsonSchema(properties: Record<string, unknown>, required: string[] = []) {
  return {
    type: "object",
    additionalProperties: false,
    required,
    properties
  };
}

export const nullableString = { type: ["string", "null"] };
export const nullableNumber = { type: ["number", "null"] };
export const nullableBoolean = { type: ["boolean", "null"] };
export const stringList = {
  type: "array",
  items: { type: "string" },
  default: []
};

