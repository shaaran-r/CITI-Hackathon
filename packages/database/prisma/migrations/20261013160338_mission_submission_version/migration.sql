-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MissionSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assignmentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "clientSubmissionId" TEXT,
    "evidenceType" TEXT NOT NULL,
    "evidenceNote" TEXT NOT NULL DEFAULT '',
    "evidenceUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewNote" TEXT,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    CONSTRAINT "MissionSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "MissionAssignment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MissionSubmission" ("assignmentId", "clientSubmissionId", "evidenceNote", "evidenceType", "evidenceUrl", "id", "reviewNote", "reviewedAt", "reviewedBy", "status", "submittedAt") SELECT "assignmentId", "clientSubmissionId", "evidenceNote", "evidenceType", "evidenceUrl", "id", "reviewNote", "reviewedAt", "reviewedBy", "status", "submittedAt" FROM "MissionSubmission";
DROP TABLE "MissionSubmission";
ALTER TABLE "new_MissionSubmission" RENAME TO "MissionSubmission";
CREATE UNIQUE INDEX "MissionSubmission_clientSubmissionId_key" ON "MissionSubmission"("clientSubmissionId");
CREATE INDEX "MissionSubmission_assignmentId_status_idx" ON "MissionSubmission"("assignmentId", "status");
CREATE UNIQUE INDEX "MissionSubmission_assignmentId_version_key" ON "MissionSubmission"("assignmentId", "version");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
