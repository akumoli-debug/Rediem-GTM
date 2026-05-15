import { prisma } from "../src/server/db/client";
import { MockProvider } from "../src/server/providers";
import {
  resolveBuyingCommittee,
  type ResolveBuyingCommitteeClient
} from "../src/server/workflows/resolveBuyingCommittee";
import {
  runTrackedWorkflow,
  type WorkflowRunTrackingClient
} from "../src/server/workflows/tracking";

type CliArgs = {
  domain?: string;
  accountId?: string;
  workspaceId?: string;
  motion?: string;
  playbookId?: string;
  maxPeople?: number;
};

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.motion) {
    throw new Error("Missing required --motion argument.");
  }

  if (!args.domain && !args.accountId) {
    throw new Error("Provide --domain or --account-id.");
  }

  const workspaceId = args.workspaceId ?? (await getOrCreateDefaultWorkspace());
  const provider = new MockProvider();
  const dossier = await runTrackedWorkflow(
    prisma as unknown as WorkflowRunTrackingClient,
    {
      workspaceId,
      workflowName: "resolveBuyingCommittee",
      inputCount: 1
    },
    () =>
      resolveBuyingCommittee(
        prisma as unknown as ResolveBuyingCommitteeClient,
        {
          people: provider,
          company: provider,
          webResearch: provider
        },
        {
          workspaceId,
          accountId: args.accountId,
          domain: args.domain,
          motion: args.motion!,
          playbookId: args.playbookId,
          maxPeople: args.maxPeople
        }
      )
  );

  console.log(JSON.stringify(dossier, null, 2));
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
    } else if (arg === "--account-id") {
      parsed.accountId = next;
      index += 1;
    } else if (arg === "--workspace-id") {
      parsed.workspaceId = next;
      index += 1;
    } else if (arg === "--motion") {
      parsed.motion = next;
      index += 1;
    } else if (arg === "--playbook-id") {
      parsed.playbookId = next;
      index += 1;
    } else if (arg === "--max-people") {
      parsed.maxPeople = next ? Number(next) : undefined;
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
