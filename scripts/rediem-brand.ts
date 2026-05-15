import { writeFile } from "node:fs/promises";
import { prisma } from "../src/server/db/client";
import {
  MCPResearchProvider,
  MockProvider,
  type WebResearchProvider
} from "../src/server/providers";
import {
  analyzeBrandForRediem,
  type AnalyzeBrandForRediemClient
} from "../src/server/workflows/analyzeBrandForRediem";
import {
  runTrackedWorkflow,
  type WorkflowRunTrackingClient
} from "../src/server/workflows/tracking";

type CliArgs = {
  domain?: string;
  workspaceId?: string;
  forceRefresh?: boolean;
  json?: boolean;
  output?: string;
};

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.domain) {
    throw new Error("Missing required --domain argument.");
  }

  const workspaceId = args.workspaceId ?? (await getOrCreateDefaultWorkspace());
  const webResearch = createWebResearchProvider();
  const dossier = await runTrackedWorkflow(
    prisma as unknown as WorkflowRunTrackingClient,
    {
      workspaceId,
      workflowName: "analyzeBrandForRediem",
      inputCount: 1
    },
    () =>
      analyzeBrandForRediem(
        prisma as unknown as AnalyzeBrandForRediemClient,
        { webResearch },
        {
          workspaceId,
          domain: args.domain!,
          forceRefresh: args.forceRefresh
        }
      )
  );

  const json = JSON.stringify(dossier, null, 2);

  if (args.output) {
    await writeFile(args.output, `${json}\n`, "utf8");
  }

  if (args.json || !args.output) {
    console.log(json);
  } else {
    console.log(`Wrote Rediem dossier to ${args.output}`);
  }
}

function createWebResearchProvider(): WebResearchProvider {
  if (process.env.GTM_ENGINE_RESEARCH_PROVIDER === "mcp") {
    return new MCPResearchProvider({
      mockResponses: process.env.MCP_RESEARCH_MOCK_RESPONSES !== "false"
    });
  }

  return new MockProvider();
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
    } else if (arg === "--force-refresh") {
      parsed.forceRefresh = true;
    } else if (arg === "--json") {
      parsed.json = true;
    } else if (arg === "--output") {
      parsed.output = next;
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
