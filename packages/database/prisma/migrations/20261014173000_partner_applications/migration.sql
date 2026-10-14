CREATE TABLE "PartnerApplication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerType" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "organizationName" TEXT,
    "email" TEXT NOT NULL,
    "website" TEXT,
    "state" TEXT,
    "district" TEXT,
    "focusAreas" TEXT NOT NULL DEFAULT '[]',
    "message" TEXT NOT NULL,
    "consentAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "PartnerApplication_status_createdAt_idx" ON "PartnerApplication"("status", "createdAt");
CREATE INDEX "PartnerApplication_partnerType_state_idx" ON "PartnerApplication"("partnerType", "state");