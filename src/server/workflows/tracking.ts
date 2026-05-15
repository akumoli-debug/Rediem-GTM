export type WorkflowRunStatus =
  | "QUEUED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELED";

export type WorkflowRunRecord = {
  id: string;
  workspaceId: string;
  workflowName: string;
  status: WorkflowRunStatus;
  inputCount?: number;
  successCount?: number;
  failureCount?: number;
  totalCostUsd?: number | string | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  errorMessage?: string | null;
  createdAt?: Date;
};

export type WorkflowRunTrackingClient = {
  workflowRun: {
    create(args: {
      data: {
        workspaceId: string;
        workflowName: string;
        status: "RUNNING";
        inputCount: number;
        startedAt: Date;
      };
    }): Promise<WorkflowRunRecord>;
    update(args: {
      where: { id: string };
      data: {
        status: "COMPLETED" | "FAILED";
        successCount?: number;
        failureCount?: number;
        totalCostUsd?: number | string | null;
        completedAt: Date;
        errorMessage?: string | null;
      };
    }): Promise<WorkflowRunRecord>;
  };
};

export async function runTrackedWorkflow<TResult>(
  client: WorkflowRunTrackingClient,
  input: {
    workspaceId: string;
    workflowName: string;
    inputCount?: number;
    inferSuccessCount?: (result: TResult) => number;
    inferTotalCostUsd?: (result: TResult) => number | string | null | undefined;
  },
  run: () => Promise<TResult>
): Promise<TResult> {
  const workflowRun = await client.workflowRun.create({
    data: {
      workspaceId: input.workspaceId,
      workflowName: input.workflowName,
      status: "RUNNING",
      inputCount: input.inputCount ?? 1,
      startedAt: new Date()
    }
  });

  try {
    const result = await run();
    const successCount = input.inferSuccessCount?.(result) ?? input.inputCount ?? 1;

    await client.workflowRun.update({
      where: { id: workflowRun.id },
      data: {
        status: "COMPLETED",
        successCount,
        failureCount: 0,
        totalCostUsd: input.inferTotalCostUsd?.(result) ?? null,
        completedAt: new Date(),
        errorMessage: null
      }
    });

    return result;
  } catch (error) {
    await client.workflowRun.update({
      where: { id: workflowRun.id },
      data: {
        status: "FAILED",
        successCount: 0,
        failureCount: input.inputCount ?? 1,
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : String(error)
      }
    });

    throw error;
  }
}
