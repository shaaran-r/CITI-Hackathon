/*
  Warnings:

  - A unique constraint covering the columns `[clientSubmissionId]` on the table `MissionSubmission` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "MissionSubmission" ADD COLUMN "clientSubmissionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MissionSubmission_clientSubmissionId_key" ON "MissionSubmission"("clientSubmissionId");
