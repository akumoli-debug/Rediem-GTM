import { prisma } from "../src/server/db/client";
import {
  MCPResearchProvider,
  MockProvider,
  type CompanyProvider,
  type WebResearchProvider
} from "../src/server/providers";
import {
  researchAccount,
  type ResearchAccountClient
} from "../src/server/workflows/researchAccount";
import {
  runTrackedWorkflow,
  type WorkflowRunTrackingClient
} from "../src/server/workflows/tracking";

type CliArgs = {
  domain?: string;
  workspaceId?: string;
  focus?: string;
  playbookId?: string;
  maxCostUsd?: number;
};

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.domain) {
    throw new Error("Missing required --domain argument.");
  }

  const workspaceId = args.workspaceId ?? (await getOrCreateDefaultWorkspace());
  const providers = createProviders();
  const dossier = await runTrackedWorkflow(
    prisma as unknown as WorkflowRunTrackingClient,
    {
      workspaceId,
      workflowName: "researchAccount",
      inputCount: 1,
      inferTotalCostUsd: (result) => result.totalCostUsd
    },
    () =>
      researchAccount(
        prisma as unknown as ResearchAccountClient,
        providers,
        {
          workspaceId,
          domain: args.domain!,
          focus: args.focus,
          playbookId: args.playbookId,
          maxCostUsd: args.maxCostUsd
        }
      )
  );

  console.log(JSON.stringify(dossier, null, 2));
}

function createProviders(): {
  company: CompanyProvider;
  webResearch: WebResearchProvider;
} {
  if (process.env.GTM_ENGINE_RESEARCH_PROVIDER === "mcp") {
    const provider = new MCPResearchProvider({
      mockResponses: process.env.MCP_RESEARCH_MOCK_RESPONSES !== "false"
    });

    return {
      company: provider,
      webResearch: provider
    };
  }

  const provider = new MockProvider();

  return {
    company: provider,
    webResearch: provider
  };
}

async function getOrCreateDefaultWorkspace(): Promise<string> {
  const existing = await prisma.workspace.findFirst({
    where: {
      name: "Default GTM Workspace"
    }
  });

  if (existing) {
    return existing.id;
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: "Default GTM Workspace"
    }
  });

  return workspace.id;
}

function parseArgs(args: string[]): CliArgs {
  const parsed: CliArgs = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if (arg === "--domain") {
      parsed.domain = next;
      index += 1;
    } else if (arg === "--workspace-id") {
      parsed.workspaceId = next;
      index += 1;
    } else if (arg === "--focus") {
      parsed.focus = next;
      index += 1;
    } else if (arg === "--playbook-id") {
      parsed.playbookId = next;
      index += 1;
    } else if (arg === "--max-cost-usd") {
      parsed.maxCostUsd = next ? Number(next) : undefined;
      index += 1;
    }
  }

  return parsed;
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
