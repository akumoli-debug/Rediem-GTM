import assert from "node:assert/strict";
import { test } from "node:test";
import { redactSensitiveValue } from "../src/server/providers/redaction";
import { runTrackedWorkflow } from "../src/server/workflows/tracking";

test("provider result redaction removes token-like fields and bearer values", () => {
  const fakeSecret = ["sk", "live", "secret", "key"].join("-");
  const fakeBearer = ["Bearer", "abcdefghijklmnopqrstuvwxyz"].join(" ");
  const fakeMessageSecret = ["sk", "supersecretvalue"].join("-");
  const redacted = redactSensitiveValue({
    accessToken: "live_access_token",
    nested: {
      apiKey: fakeSecret,
      safe: fakeBearer
    },
    message: `token ${fakeMessageSecret} should not leak`
  }) as {
    accessToken: string;
    nested: { apiKey: string; safe: string };
    message: string;
  };

  assert.equal(redacted.accessToken, "[REDACTED]");
  assert.equal(redacted.nested.apiKey, "[REDACTED]");
  assert.equal(redacted.nested.safe, "[REDACTED]");
  assert.equal(redacted.message.includes(fakeMessageSecret), false);
});

test("runTrackedWorkflow captures completed workflow runs", async () => {
  const updates: unknown[] = [];
  const client = {
    workflowRun: {
      async create() {
        return {
          id: "run_1",
          workspaceId: "workspace_1",
          workflowName: "test_workflow",
          status: "RUNNING" as const
        };
      },
      async update(args: unknown) {
        updates.push(args);
        return {
          id: "run_1",
          workspaceId: "workspace_1",
          workflowName: "test_workflow",
          status: "COMPLETED" as const
        };
      }
    }
  };

  const result = await runTrackedWorkflow(
    client,
    {
      workspaceId: "workspace_1",
      workflowName: "test_workflow",
      inferTotalCostUsd: () => 0.12
    },
    async () => ({ ok: true })
  );

  assert.deepEqual(result, { ok: true });
  assert.equal((updates[0] as { data: { status: string } }).data.status, "COMPLETED");
  assert.equal((updates[0] as { data: { totalCostUsd: number } }).data.totalCostUsd, 0.12);
});

test("runTrackedWorkflow captures failed workflow runs", async () => {
  const updates: unknown[] = [];
  const client = {
    workflowRun: {
      async create() {
        return {
          id: "run_1",
          workspaceId: "workspace_1",
          workflowName: "test_workflow",
          status: "RUNNING" as const
        };
      },
      async update(args: unknown) {
        updates.push(args);
        return {
          id: "run_1",
          workspaceId: "workspace_1",
          workflowName: "test_workflow",
          status: "FAILED" as const
        };
      }
    }
  };

  await assert.rejects(
    () =>
      runTrackedWorkflow(
        client,
        {
          workspaceId: "workspace_1",
          workflowName: "test_workflow"
        },
        async () => {
          throw new Error("provider failed");
        }
      ),
    /provider failed/
  );

  assert.equal((updates[0] as { data: { status: string } }).data.status, "FAILED");
  assert.equal(
    (updates[0] as { data: { errorMessage: string } }).data.errorMessage,
    "provider failed"
  );
});
