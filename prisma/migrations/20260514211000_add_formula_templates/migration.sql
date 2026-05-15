-- CreateTable
CREATE TABLE "FormulaTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "scope" "FormulaScope" NOT NULL,
    "expression" TEXT NOT NULL,
    "outputType" "FormulaOutputType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormulaTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FormulaTemplate_key_key" ON "FormulaTemplate"("key");

-- CreateIndex
CREATE INDEX "FormulaTemplate_scope_idx" ON "FormulaTemplate"("scope");
