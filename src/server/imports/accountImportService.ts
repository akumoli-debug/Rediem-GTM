import { prisma } from "@/server/db/client";
import { MockProvider } from "@/server/providers";
import {
  researchAccount,
  type ResearchAccountClient
} from "@/server/workflows/researchAccount";
import { previewAccountsCsv } from "./accountsCsv";

export type AccountImportResult = {
  workspaceId: string;
  preview: ReturnType<typeof previewAccountsCsv>;
  createdCount: number;
  skippedCount: number;
  researchedCount: number;
};

export async function previewAccountImport(input: {
  workspaceId?: string;
  csv: string;
}) {
  const workspace = await getOrCreateWorkspace(input.workspaceId);
  const existingDomains = await getExistingDomains(workspace.id);

  return {
    workspaceId: workspace.id,
    rows: previewAccountsCsv(input.csv, existingDomains)
  };
}

export async function importAccountsFromCsv(input: {
  workspaceId?: string;
  csv: string;
  triggerResearch?: boolean;
  playbookId?: string;
}): Promise<AccountImportResult> {
  const workspace = await getOrCreateWorkspace(input.workspaceId);
  const existingDomains = await getExistingDomains(workspace.id);
  const preview = previewAccountsCsv(input.csv, existingDomains);
  const validRows = preview.filter((row) => row.status === "VALID");
  const created = [];

  for (const row of validRows) {
    const account = await prisma.account.create({
      data: {
        workspaceId: workspace.id,
        domain: row.domain,
        name: row.companyName ?? row.domain,
        linkedinUrl: row.linkedinUrl,
        industry: row.industry
      }
    });
    created.push(account);

    if (row.notes) {
      await prisma.evidence.create({
        data: {
          workspaceId: workspace.id,
          entityType: "ACCOUNT",
          entityId: account.id,
          fieldName: "notes",
          value: row.notes,
          provider: "csv-import",
          confidence: 1
        }
      });
    }
  }

  let researchedCount = 0;
  if (input.triggerResearch) {
    const provider = new MockProvider();
    for (const account of created) {
      if (!account.domain) {
        continue;
      }
      await researchAccount(
        prisma as unknown as ResearchAccountClient,
        { company: provider, webResearch: provider },
        {
          workspaceId: workspace.id,
          domain: account.domain,
          playbookId: input.playbookId,
          maxCostUsd: 0.25
        }
      );
      researchedCount += 1;
    }
  }

  return {
    workspaceId: workspace.id,
    preview,
    createdCount: created.length,
    skippedCount: preview.length - created.length,
    researchedCount
  };
}

async function getOrCreateWorkspace(workspaceId?: string) {
  if (workspaceId) {
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (workspace) {
      return workspace;
    }
  }

  const existing = await prisma.workspace.findFirst({ orderBy: { createdAt: "asc" } });
  if (existing) {
    return existing;
  }

  return prisma.workspace.create({
    data: { name: "Default GTM Workspace" }
  });
}

async function getExistingDomains(workspaceId: string) {
  const accounts = await prisma.account.findMany({
    where: { workspaceId, domain: { not: null } },
    select: { domain: true }
  });

  return accounts.flatMap((account) => (account.domain ? [account.domain] : []));
}
