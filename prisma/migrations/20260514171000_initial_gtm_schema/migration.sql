-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('UNKNOWN', 'VERIFIED', 'RISKY', 'CATCH_ALL', 'INVALID', 'SUPPRESSED');

-- CreateEnum
CREATE TYPE "PersonaType" AS ENUM ('ECONOMIC_BUYER', 'TECHNICAL_BUYER', 'DAY_TO_DAY_OWNER', 'INFLUENCER', 'CHAMPION_CANDIDATE', 'BLOCKER_CANDIDATE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "SignalType" AS ENUM ('FUNDING', 'HIRING', 'PRODUCT_LAUNCH', 'PRICING_CHANGE', 'TECH_STACK', 'COMPLIANCE', 'EXPANSION', 'NEWS', 'FOUNDER_POST', 'OTHER');

-- CreateEnum
CREATE TYPE "EvidenceEntityType" AS ENUM ('ACCOUNT', 'PERSON', 'SIGNAL', 'FORMULA_RESULT');

-- CreateEnum
CREATE TYPE "FormulaResultEntityType" AS ENUM ('ACCOUNT', 'PERSON');

-- CreateEnum
CREATE TYPE "WorkflowRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ProviderResultStatus" AS ENUM ('SUCCESS', 'PARTIAL', 'FAILED', 'CACHED');

-- CreateEnum
CREATE TYPE "FormulaScope" AS ENUM ('ACCOUNT', 'PERSON');

-- CreateEnum
CREATE TYPE "FormulaOutputType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'DATE', 'JSON');

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "domain" TEXT,
    "name" TEXT NOT NULL,
    "linkedinUrl" TEXT,
    "industry" TEXT,
    "employeeCount" INTEGER,
    "hqLocation" TEXT,
    "websiteSummary" TEXT,
    "pricingSummary" TEXT,
    "careersSummary" TEXT,
    "blogSummary" TEXT,
    "pressSummary" TEXT,
    "accountScore" DOUBLE PRECISION,
    "confidenceScore" DOUBLE PRECISION,
    "lastEnrichedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "accountId" TEXT,
    "fullName" TEXT NOT NULL,
    "title" TEXT,
    "seniority" TEXT,
    "department" TEXT,
    "linkedinUrl" TEXT,
    "email" TEXT,
    "emailStatus" "EmailStatus" NOT NULL DEFAULT 'UNKNOWN',
    "emailVerifiedAt" TIMESTAMP(3),
    "phone" TEXT,
    "location" TEXT,
    "personaType" "PersonaType" NOT NULL DEFAULT 'UNKNOWN',
    "roleScore" DOUBLE PRECISION,
    "contactabilityScore" DOUBLE PRECISION,
    "sourceConfidence" DOUBLE PRECISION,
    "lastEnrichedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signal" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" "SignalType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "signalDate" TIMESTAMP(3),
    "freshnessScore" DOUBLE PRECISION,
    "relevanceScore" DOUBLE PRECISION,
    "sourceQualityScore" DOUBLE PRECISION,
    "totalScore" DOUBLE PRECISION,
    "sourceUrl" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Signal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "entityType" "EvidenceEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "value" TEXT,
    "sourceUrl" TEXT,
    "provider" TEXT,
    "rawExcerpt" TEXT,
    "confidence" DOUBLE PRECISION,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowRun" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "workflowName" TEXT NOT NULL,
    "status" "WorkflowRunStatus" NOT NULL DEFAULT 'QUEUED',
    "inputCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "totalCostUsd" DECIMAL(12,4),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderResult" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "workflowRunId" TEXT,
    "provider" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "rawResponse" JSONB,
    "normalizedResponse" JSONB,
    "costUsd" DECIMAL(12,4),
    "latencyMs" INTEGER,
    "status" "ProviderResultStatus" NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormulaColumn" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scope" "FormulaScope" NOT NULL,
    "expression" TEXT NOT NULL,
    "outputType" "FormulaOutputType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormulaColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormulaResult" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "formulaColumnId" TEXT NOT NULL,
    "entityType" "FormulaResultEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "value" JSONB,
    "error" TEXT,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormulaResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CacheEntry" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CacheEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Account_workspaceId_idx" ON "Account"("workspaceId");

-- CreateIndex
CREATE INDEX "Account_linkedinUrl_idx" ON "Account"("linkedinUrl");

-- CreateIndex
CREATE INDEX "Account_accountScore_idx" ON "Account"("accountScore");

-- CreateIndex
CREATE UNIQUE INDEX "Account_workspaceId_domain_key" ON "Account"("workspaceId", "domain");

-- CreateIndex
CREATE INDEX "Person_workspaceId_idx" ON "Person"("workspaceId");

-- CreateIndex
CREATE INDEX "Person_accountId_idx" ON "Person"("accountId");

-- CreateIndex
CREATE INDEX "Person_linkedinUrl_idx" ON "Person"("linkedinUrl");

-- CreateIndex
CREATE INDEX "Person_email_idx" ON "Person"("email");

-- CreateIndex
CREATE INDEX "Person_personaType_idx" ON "Person"("personaType");

-- CreateIndex
CREATE INDEX "Signal_workspaceId_idx" ON "Signal"("workspaceId");

-- CreateIndex
CREATE INDEX "Signal_accountId_idx" ON "Signal"("accountId");

-- CreateIndex
CREATE INDEX "Signal_accountId_type_signalDate_idx" ON "Signal"("accountId", "type", "signalDate");

-- CreateIndex
CREATE INDEX "Evidence_workspaceId_idx" ON "Evidence"("workspaceId");

-- CreateIndex
CREATE INDEX "Evidence_entityType_entityId_fieldName_idx" ON "Evidence"("entityType", "entityId", "fieldName");

-- CreateIndex
CREATE INDEX "Evidence_provider_idx" ON "Evidence"("provider");

-- CreateIndex
CREATE INDEX "WorkflowRun_workspaceId_idx" ON "WorkflowRun"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkflowRun_status_idx" ON "WorkflowRun"("status");

-- CreateIndex
CREATE INDEX "WorkflowRun_createdAt_idx" ON "WorkflowRun"("createdAt");

-- CreateIndex
CREATE INDEX "ProviderResult_workspaceId_idx" ON "ProviderResult"("workspaceId");

-- CreateIndex
CREATE INDEX "ProviderResult_workflowRunId_idx" ON "ProviderResult"("workflowRunId");

-- CreateIndex
CREATE INDEX "ProviderResult_provider_toolName_idx" ON "ProviderResult"("provider", "toolName");

-- CreateIndex
CREATE INDEX "ProviderResult_inputHash_idx" ON "ProviderResult"("inputHash");

-- CreateIndex
CREATE INDEX "ProviderResult_status_idx" ON "ProviderResult"("status");

-- CreateIndex
CREATE INDEX "FormulaColumn_workspaceId_idx" ON "FormulaColumn"("workspaceId");

-- CreateIndex
CREATE INDEX "FormulaColumn_scope_idx" ON "FormulaColumn"("scope");

-- CreateIndex
CREATE UNIQUE INDEX "FormulaColumn_workspaceId_name_scope_key" ON "FormulaColumn"("workspaceId", "name", "scope");

-- CreateIndex
CREATE INDEX "FormulaResult_workspaceId_idx" ON "FormulaResult"("workspaceId");

-- CreateIndex
CREATE INDEX "FormulaResult_formulaColumnId_idx" ON "FormulaResult"("formulaColumnId");

-- CreateIndex
CREATE INDEX "FormulaResult_entityType_entityId_idx" ON "FormulaResult"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "FormulaResult_formulaColumnId_entityType_entityId_key" ON "FormulaResult"("formulaColumnId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "CacheEntry_expiresAt_idx" ON "CacheEntry"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "CacheEntry_namespace_key_key" ON "CacheEntry"("namespace", "key");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderResult" ADD CONSTRAINT "ProviderResult_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderResult" ADD CONSTRAINT "ProviderResult_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "WorkflowRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormulaColumn" ADD CONSTRAINT "FormulaColumn_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormulaResult" ADD CONSTRAINT "FormulaResult_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormulaResult" ADD CONSTRAINT "FormulaResult_formulaColumnId_fkey" FOREIGN KEY ("formulaColumnId") REFERENCES "FormulaColumn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
