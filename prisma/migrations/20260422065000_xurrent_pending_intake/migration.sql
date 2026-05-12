CREATE TYPE "IntakeStatus" AS ENUM ('pending', 'approved', 'ignored');

CREATE TABLE "ExternalServiceMapping" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalServiceId" TEXT,
    "externalServiceName" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalServiceMapping_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PendingIncidentIntake" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalRequestId" TEXT NOT NULL,
    "externalEventId" TEXT,
    "externalServiceId" TEXT,
    "externalServiceName" TEXT NOT NULL,
    "suggestedApplicationId" TEXT,
    "incidentTypeId" TEXT NOT NULL,
    "status" "IntakeStatus" NOT NULL DEFAULT 'pending',
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "priority" TEXT,
    "majorIncidentStatus" TEXT,
    "workingTeams" TEXT,
    "nextUpdateAt" TIMESTAMP(3),
    "payloadJson" JSONB NOT NULL,
    "approvedIncidentId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "ignoredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingIncidentIntake_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExternalServiceMapping_source_externalServiceName_key" ON "ExternalServiceMapping"("source", "externalServiceName");
CREATE INDEX "ExternalServiceMapping_source_externalServiceId_idx" ON "ExternalServiceMapping"("source", "externalServiceId");
CREATE INDEX "ExternalServiceMapping_applicationId_idx" ON "ExternalServiceMapping"("applicationId");
CREATE UNIQUE INDEX "PendingIncidentIntake_source_externalRequestId_status_key" ON "PendingIncidentIntake"("source", "externalRequestId", "status");
CREATE INDEX "PendingIncidentIntake_status_createdAt_idx" ON "PendingIncidentIntake"("status", "createdAt");
CREATE INDEX "PendingIncidentIntake_suggestedApplicationId_idx" ON "PendingIncidentIntake"("suggestedApplicationId");

ALTER TABLE "ExternalServiceMapping" ADD CONSTRAINT "ExternalServiceMapping_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PendingIncidentIntake" ADD CONSTRAINT "PendingIncidentIntake_suggestedApplicationId_fkey" FOREIGN KEY ("suggestedApplicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PendingIncidentIntake" ADD CONSTRAINT "PendingIncidentIntake_incidentTypeId_fkey" FOREIGN KEY ("incidentTypeId") REFERENCES "IncidentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
