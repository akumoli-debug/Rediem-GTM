const SENSITIVE_KEY_PATTERN =
  /(^|[_-])(api[-_]?key|key|token|secret|password|authorization|cookie|refresh[-_]?token|access[-_]?token|client[-_]?secret)([_-]|$)/i;
const SECRET_VALUE_PATTERNS = [
  /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/gi,
  /\bsk-[A-Za-z0-9_-]{12,}/g,
  /\b[A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\b/g
];

export const REDACTED_VALUE = "[REDACTED]";

export function redactSensitiveValue(value: unknown): unknown {
  return redactValue(value, false);
}

function redactValue(value: unknown, sensitiveContext: boolean): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (sensitiveContext) {
    return REDACTED_VALUE;
  }

  if (typeof value === "string") {
    return redactString(value);
  }

  if (typeof value !== "object") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, false));
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, child]) => [
      key,
      redactValue(child, SENSITIVE_KEY_PATTERN.test(key))
    ])
  );
}

function redactString(value: string): string {
  return SECRET_VALUE_PATTERNS.reduce(
    (current, pattern) => current.replace(pattern, REDACTED_VALUE),
    value
  );
}
