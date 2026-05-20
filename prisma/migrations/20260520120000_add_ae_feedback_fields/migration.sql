ALTER TABLE "Account"
ADD COLUMN "playbookAccepted" BOOLEAN,
ADD COLUMN "playbookOverrideReason" TEXT,
ADD COLUMN "aeNotes" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewedBy" TEXT;
