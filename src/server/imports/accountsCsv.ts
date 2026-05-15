import { canonicalizeDomain } from "@/server/workflows/researchAccount";
import { parseCsv } from "@/server/exports/csv";

export type AccountCsvRow = {
  rowNumber: number;
  domain: string;
  companyName?: string;
  linkedinUrl?: string;
  industry?: string;
  notes?: string;
  status: "VALID" | "INVALID" | "DUPLICATE_FILE" | "DUPLICATE_WORKSPACE";
  error?: string;
};

const HEADER_ALIASES = {
  domain: ["domain", "companydomain", "company_domain"],
  website: [
    "companywebsite",
    "company_website",
    "website",
    "url",
    "companyurl",
    "company_url"
  ],
  companyName: ["companyname", "company_name", "name", "accountname", "account_name"],
  linkedinUrl: ["linkedinurl", "linkedin_url", "linkedin", "companylinkedin"],
  industry: ["industry"],
  notes: ["notes", "note"]
};

export function previewAccountsCsv(
  csv: string,
  existingDomains: Iterable<string> = []
): AccountCsvRow[] {
  const parsedRows = parseCsv(csv);
  const seenDomains = new Set<string>();
  const existing = new Set(Array.from(existingDomains).map((domain) => domain.toLowerCase()));

  return parsedRows.map((row, index) => {
    const normalized = normalizeCsvRow(row);
    const rawDomain = normalized.domain || normalized.website;
    const rowNumber = index + 2;

    if (!rawDomain) {
      return {
        rowNumber,
        domain: "",
        companyName: normalized.companyName,
        linkedinUrl: normalized.linkedinUrl,
        industry: normalized.industry,
        notes: normalized.notes,
        status: "INVALID",
        error: "Missing required domain or company website."
      };
    }

    const domainResult = normalizeDomain(rawDomain);
    if (!domainResult.ok) {
      return {
        rowNumber,
        domain: rawDomain,
        companyName: normalized.companyName,
        linkedinUrl: normalized.linkedinUrl,
        industry: normalized.industry,
        notes: normalized.notes,
        status: "INVALID",
        error: domainResult.error
      };
    }

    const domain = domainResult.domain;
    const base = {
      rowNumber,
      domain,
      companyName: normalized.companyName,
      linkedinUrl: normalized.linkedinUrl,
      industry: normalized.industry,
      notes: normalized.notes
    };

    if (seenDomains.has(domain)) {
      return {
        ...base,
        status: "DUPLICATE_FILE" as const,
        error: "Duplicate domain in this CSV."
      };
    }

    seenDomains.add(domain);

    if (existing.has(domain)) {
      return {
        ...base,
        status: "DUPLICATE_WORKSPACE" as const,
        error: "Account already exists in this workspace."
      };
    }

    return {
      ...base,
      status: "VALID" as const
    };
  });
}

export function normalizeDomain(input: string):
  | { ok: true; domain: string }
  | { ok: false; error: string } {
  try {
    const domain = canonicalizeDomain(input.trim());

    if (!/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
      return { ok: false, error: "Domain must include a valid public suffix." };
    }

    if (domain.includes("..") || domain.length > 253) {
      return { ok: false, error: "Domain is malformed." };
    }

    return { ok: true, domain };
  } catch {
    return { ok: false, error: "Could not parse domain or company website." };
  }
}

function normalizeCsvRow(row: Record<string, string>) {
  return {
    domain: findValue(row, HEADER_ALIASES.domain),
    website: findValue(row, HEADER_ALIASES.website),
    companyName: findValue(row, HEADER_ALIASES.companyName),
    linkedinUrl: findValue(row, HEADER_ALIASES.linkedinUrl),
    industry: findValue(row, HEADER_ALIASES.industry),
    notes: findValue(row, HEADER_ALIASES.notes)
  };
}

function findValue(row: Record<string, string>, aliases: string[]) {
  const entries = Object.entries(row).map(([key, value]) => [
    key.toLowerCase().replace(/[^a-z0-9]/g, ""),
    value.trim()
  ]);
  const match = entries.find(([key, value]) => aliases.includes(key) && value !== "");

  return match?.[1] || undefined;
}

