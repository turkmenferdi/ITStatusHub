-- DropIndex
DROP INDEX "Application_statusPageOrder_idx";

-- CreateTable
CREATE TABLE "PostMortem" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "severity" TEXT,
    "impact" TEXT,
    "timeline" TEXT,
    "rootCause" TEXT,
    "contributingFactors" TEXT,
    "lessonsLearned" TEXT,
    "actionItems" TEXT,
    "authorName" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostMortem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusPageSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMP(3),

    CONSTRAINT "StatusPageSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PostMortem_incidentId_key" ON "PostMortem"("incidentId");

-- CreateIndex
CREATE INDEX "PostMortem_incidentId_idx" ON "PostMortem"("incidentId");

-- CreateIndex
CREATE UNIQUE INDEX "StatusPageSubscriber_email_key" ON "StatusPageSubscriber"("email");

-- CreateIndex
CREATE INDEX "StatusPageSubscriber_isActive_idx" ON "StatusPageSubscriber"("isActive");

-- AddForeignKey
ALTER TABLE "PostMortem" ADD CONSTRAINT "PostMortem_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "ApplicationDependency_upstreamApplicationId_downstreamApplicati" RENAME TO "ApplicationDependency_upstreamApplicationId_downstreamAppli_key";
