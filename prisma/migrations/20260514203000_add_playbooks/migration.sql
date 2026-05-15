-- CreateTable
CREATE TABLE "Playbook" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetMotion" TEXT NOT NULL,
    "targetPersonas" JSONB NOT NULL,
    "accountFitRules" JSONB NOT NULL,
    "signalTypes" JSONB NOT NULL,
    "formulaColumns" JSONB NOT NULL,
    "workflowSteps" JSONB NOT NULL,
    "exportFields" JSONB NOT NULL,
    "budgetDefaults" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Playbook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Playbook_workspaceId_idx" ON "Playbook"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Playbook_workspaceId_name_key" ON "Playbook"("workspaceId", "name");

-- AddForeignKey
ALTER TABLE "Playbook" ADD CONSTRAINT "Playbook_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
