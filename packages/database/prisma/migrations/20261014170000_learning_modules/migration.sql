CREATE TABLE "LearningModule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "facilitatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'hi',
    "lessons" TEXT NOT NULL DEFAULT '[]',
    "pricingModel" TEXT NOT NULL DEFAULT 'FREE',
    "priceInr" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LearningModule_facilitatorId_fkey" FOREIGN KEY ("facilitatorId") REFERENCES "Facilitator" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "LearningModule_facilitatorId_status_idx" ON "LearningModule"("facilitatorId", "status");
CREATE INDEX "LearningModule_status_category_idx" ON "LearningModule"("status", "category");