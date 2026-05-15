import assert from "node:assert/strict";
import { test } from "node:test";
import { examplePlaybooks } from "../src/server/playbooks/examples";
import {
  getPlaybookForWorkflow,
  playbookMotion,
  playbookRoleHints
} from "../src/server/playbooks/service";
import type { PlaybookClient, SavedPlaybook } from "../src/server/playbooks/types";

const savedPlaybook: SavedPlaybook = {
  id: "playbook_1",
  workspaceId: "workspace_1",
  ...examplePlaybooks[0]!
};

test("example playbooks define the requested motions and defaults", () => {
  assert.deepEqual(
    examplePlaybooks.map((playbook) => playbook.name),
    [
      "AI GTM Workflow Sale",
      "Developer Infrastructure Sale",
      "VC Founder Research"
    ]
  );
  assert.ok(examplePlaybooks[0]?.targetPersonas.includes("RevOps"));
  assert.ok(examplePlaybooks[1]?.targetPersonas.includes("DevOps/SRE"));
  assert.ok(examplePlaybooks[2]?.signalTypes.includes("founder posts"));
  assert.ok(examplePlaybooks.every((playbook) => playbook.formulaColumns.length > 0));
  assert.ok(examplePlaybooks.every((playbook) => playbook.exportFields.length > 0));
});

test("getPlaybookForWorkflow loads a saved playbook by workspace", async () => {
  const client: PlaybookClient = {
    playbook: {
      async findFirst(args) {
        return args.where.id === savedPlaybook.id &&
          args.where.workspaceId === savedPlaybook.workspaceId
          ? savedPlaybook
          : null;
      }
    }
  };

  const playbook = await getPlaybookForWorkflow(client, {
    workspaceId: "workspace_1",
    playbookId: "playbook_1"
  });

  assert.equal(playbook?.name, "AI GTM Workflow Sale");
  assert.equal(playbookMotion(playbook, undefined), "AI GTM workflow software");
});

test("playbook role hints combine target personas with motion hints", () => {
  const hints = playbookRoleHints(savedPlaybook, ["revenue operations", "sales ops"]);

  assert.ok(hints.includes("RevOps"));
  assert.ok(hints.includes("CRO"));
  assert.ok(hints.includes("revenue operations"));
});

test("playbook lookup returns null when no playbookId is provided", async () => {
  const playbook = await getPlaybookForWorkflow({}, { workspaceId: "workspace_1" });

  assert.equal(playbook, null);
});
