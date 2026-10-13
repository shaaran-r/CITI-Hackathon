-- AlterTable
ALTER TABLE "StudentProfile" ADD COLUMN "district" TEXT;
ALTER TABLE "StudentProfile" ADD COLUMN "state" TEXT;

-- CreateTable
CREATE TABLE "OpportunityApplication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "notes" TEXT,
    "documentsChecklist" TEXT NOT NULL DEFAULT '[]',
    "helpRequestedAt" DATETIME,
    "helpRequestNote" TEXT,
    "facilitatorNote" TEXT,
    "submittedAt" DATETIME,
    "reviewedAt" DATETIME,
    "reviewedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OpportunityApplication_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OpportunityApplication_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Opportunity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "eligibility" TEXT NOT NULL DEFAULT '{}',
    "district" TEXT,
    "state" TEXT,
    "stipendMin" INTEGER,
    "stipendMax" INTEGER,
    "requiredBadgeSlugs" TEXT NOT NULL DEFAULT '[]',
    "requiredDocuments" TEXT NOT NULL DEFAULT '[]',
    "pathwaySlugs" TEXT NOT NULL DEFAULT '[]',
    "applyBy" DATETIME,
    "isDemo" BOOLEAN NOT NULL DEFAULT true,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Opportunity" ("applyBy", "createdAt", "description", "eligibility", "id", "isDemo", "isPublished", "provider", "slug", "title", "type", "updatedAt") SELECT "applyBy", "createdAt", "description", "eligibility", "id", "isDemo", "isPublished", "provider", "slug", "title", "type", "updatedAt" FROM "Opportunity";
DROP TABLE "Opportunity";
ALTER TABLE "new_Opportunity" RENAME TO "Opportunity";
CREATE UNIQUE INDEX "Opportunity_slug_key" ON "Opportunity"("slug");
CREATE INDEX "Opportunity_type_isPublished_idx" ON "Opportunity"("type", "isPublished");
CREATE TABLE "new_OpportunityMatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "rationale" TEXT NOT NULL,
    "savedAt" DATETIME,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recommendedById" TEXT,
    "facilitatorNote" TEXT,
    "recommendedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OpportunityMatch_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OpportunityMatch_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_OpportunityMatch" ("createdAt", "id", "opportunityId", "rationale", "savedAt", "score", "studentId") SELECT "createdAt", "id", "opportunityId", "rationale", "savedAt", "score", "studentId" FROM "OpportunityMatch";
DROP TABLE "OpportunityMatch";
ALTER TABLE "new_OpportunityMatch" RENAME TO "OpportunityMatch";
CREATE INDEX "OpportunityMatch_studentId_score_idx" ON "OpportunityMatch"("studentId", "score");
CREATE UNIQUE INDEX "OpportunityMatch_studentId_opportunityId_key" ON "OpportunityMatch"("studentId", "opportunityId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "OpportunityApplication_studentId_status_idx" ON "OpportunityApplication"("studentId", "status");

-- CreateIndex
CREATE INDEX "OpportunityApplication_status_helpRequestedAt_idx" ON "OpportunityApplication"("status", "helpRequestedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OpportunityApplication_studentId_opportunityId_key" ON "OpportunityApplication"("studentId", "opportunityId");
