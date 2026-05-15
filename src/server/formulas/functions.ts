import { FormulaError, type FormulaValue } from "./types";

export type FormulaFunction = (
  args: FormulaValue[],
  options: { now: Date }
) => FormulaValue;

export const formulaFunctions: Record<string, FormulaFunction> = {
  IF(args) {
    requireArity("IF", args, 3);
    return isTruthy(args[0]) ? args[1] ?? null : args[2] ?? null;
  },
  AND(args) {
    return args.every(isTruthy);
  },
  OR(args) {
    return args.some(isTruthy);
  },
  NOT(args) {
    requireArity("NOT", args, 1);
    return !isTruthy(args[0]);
  },
  CONTAINS(args) {
    requireArity("CONTAINS", args, 2);
    return toText(args[0]).includes(toText(args[1]));
  },
  LOWER(args) {
    requireArity("LOWER", args, 1);
    return toText(args[0]).toLowerCase();
  },
  UPPER(args) {
    requireArity("UPPER", args, 1);
    return toText(args[0]).toUpperCase();
  },
  TRIM(args) {
    requireArity("TRIM", args, 1);
    return toText(args[0]).trim();
  },
  CONCAT(args) {
    return args.map(toText).join("");
  },
  COALESCE(args) {
    return args.find((arg) => !isEmpty(arg)) ?? null;
  },
  REGEX_MATCH(args) {
    requireArity("REGEX_MATCH", args, 2);

    try {
      return new RegExp(toText(args[1])).test(toText(args[0]));
    } catch {
      throw new FormulaError(`Invalid REGEX_MATCH pattern '${toText(args[1])}'`);
    }
  },
  DAYS_SINCE(args, options) {
    requireArity("DAYS_SINCE", args, 1);
    const date = toDate(args[0], "DAYS_SINCE");
    return Math.floor((options.now.getTime() - date.getTime()) / 86_400_000);
  },
  DATE_DIFF(args) {
    requireArity("DATE_DIFF", args, 3);
    const left = toDate(args[0], "DATE_DIFF");
    const right = toDate(args[1], "DATE_DIFF");
    const unit = toText(args[2]).toLowerCase();
    const diffMs = left.getTime() - right.getTime();

    if (unit === "days" || unit === "day") {
      return Math.floor(diffMs / 86_400_000);
    }

    if (unit === "hours" || unit === "hour") {
      return Math.floor(diffMs / 3_600_000);
    }

    if (unit === "minutes" || unit === "minute") {
      return Math.floor(diffMs / 60_000);
    }

    throw new FormulaError(`Unsupported DATE_DIFF unit '${unit}'`);
  },
  ROUND(args) {
    requireArity("ROUND", args, 2);
    const decimals = toNumber(args[1], "ROUND decimals");
    const factor = 10 ** decimals;
    return Math.round(toNumber(args[0], "ROUND value") * factor) / factor;
  },
  MIN(args) {
    return Math.min(...args.map((arg) => toNumber(arg, "MIN")));
  },
  MAX(args) {
    return Math.max(...args.map((arg) => toNumber(arg, "MAX")));
  },
  AVG(args) {
    if (args.length === 0) {
      return 0;
    }

    return sumNumbers(args, "AVG") / args.length;
  },
  SUM(args) {
    return sumNumbers(args, "SUM");
  },
  SCORE(args) {
    return sumNumbers(args, "SCORE");
  },
  EXISTS(args) {
    requireArity("EXISTS", args, 1);
    return !isEmpty(args[0]);
  },
  EMPTY(args) {
    requireArity("EMPTY", args, 1);
    return isEmpty(args[0]);
  }
};

export function isTruthy(value: FormulaValue | undefined): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    return value.length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
}

export function toNumber(value: FormulaValue | undefined, label: string): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
    return Number(value);
  }

  throw new FormulaError(`${label} expected a number, received ${describeValue(value)}`);
}

export function toText(value: FormulaValue | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

export function toDate(value: FormulaValue | undefined, label: string): Date {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  throw new FormulaError(`${label} expected a date, received ${describeValue(value)}`);
}

function requireArity(name: string, args: FormulaValue[], count: number): void {
  if (args.length !== count) {
    throw new FormulaError(`${name} expects ${count} arguments, received ${args.length}`);
  }
}

function sumNumbers(args: FormulaValue[], label: string): number {
  return args.reduce<number>((sum, arg) => sum + toNumber(arg, label), 0);
}

function isEmpty(value: FormulaValue | undefined): boolean {
  return (
    value === null ||
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

function describeValue(value: FormulaValue | undefined): string {
  if (value === null) {
    return "null";
  }

  if (value === undefined) {
    return "undefined";
  }

  if (value instanceof Date) {
    return "date";
  }

  if (Array.isArray(value)) {
    return "array";
  }

  return typeof value;
}
