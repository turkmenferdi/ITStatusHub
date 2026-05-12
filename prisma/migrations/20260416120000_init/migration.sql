-- CreateEnum
CREATE TYPE "StatusColor" AS ENUM ('green', 'yellow', 'red', 'blue');

-- CreateEnum
CREATE TYPE "IncidentStage" AS ENUM ('started', 'update', 'resolved', 'maintenance');

-- CreateEnum
CREATE TYPE "GroupType" AS ENUM ('technical', 'business', 'executive', 'maintenance');

-- CreateEnum
CREATE TYPE "DeliveryMode" AS ENUM ('dev', 'smtp');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('simulated', 'sent', 'failed');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('system', 'user', 'webhook');

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "ownerTeam" TEXT NOT NULL,
    "statusPageLabel" TEXT NOT NULL,
    "defaultStatus" "StatusColor" NOT NULL DEFAULT 'green',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "groupType" "GroupType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationGroupMember" (
    "id" TEXT NOT NULL,
    "notificationGroupId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationGroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "severityLevel" INTEGER NOT NULL,
    "defaultColor" "StatusColor" NOT NULL,
    "notifyTechnical" BOOLEAN NOT NULL DEFAULT true,
    "notifyBusiness" BOOLEAN NOT NULL DEFAULT true,
    "notifyExecutive" BOOLEAN NOT NULL DEFAULT false,
    "isMaintenance" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncidentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationGroupRule" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "incidentTypeId" TEXT NOT NULL,
    "technicalGroupId" TEXT,
    "businessGroupId" TEXT,
    "executiveGroupId" TEXT,
    "maintenanceGroupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationGroupRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT,
    "incidentTypeId" TEXT,
    "stage" "IncidentStage" NOT NULL,
    "subjectTemplate" TEXT NOT NULL,
    "bodyHtmlTemplate" TEXT NOT NULL,
    "bodyTextTemplate" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "xurrentRequestId" TEXT NOT NULL,
    "xurrentMajorIncidentStatus" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "incidentTypeId" TEXT NOT NULL,
    "currentStage" "IncidentStage" NOT NULL,
    "currentColor" "StatusColor" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "workingTeams" TEXT NOT NULL,
    "nextUpdateAt" TIMESTAMP(3),
    "statusPagePublicId" TEXT,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentNotification" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "stage" "IncidentStage" NOT NULL,
    "recipientGroupId" TEXT NOT NULL,
    "deliveryMode" "DeliveryMode" NOT NULL,
    "subjectRendered" TEXT NOT NULL,
    "bodyRendered" TEXT NOT NULL,
    "deliveryStatus" "DeliveryStatus" NOT NULL,
    "providerMessageId" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorType" "ActorType" NOT NULL,
    "actorName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalEventId" TEXT,
    "eventType" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "signature" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "processingError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Application_code_key" ON "Application"("code");

-- CreateIndex
CREATE INDEX "Application_isActive_idx" ON "Application"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationGroup_name_key" ON "NotificationGroup"("name");

-- CreateIndex
CREATE INDEX "NotificationGroup_groupType_isActive_idx" ON "NotificationGroup"("groupType", "isActive");

-- CreateIndex
CREATE INDEX "NotificationGroupMember_email_idx" ON "NotificationGroupMember"("email");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationGroupMember_notificationGroupId_email_key" ON "NotificationGroupMember"("notificationGroupId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "IncidentType_name_key" ON "IncidentType"("name");

-- CreateIndex
CREATE INDEX "IncidentType_severityLevel_idx" ON "IncidentType"("severityLevel");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationGroupRule_applicationId_incidentTypeId_key" ON "ApplicationGroupRule"("applicationId", "incidentTypeId");

-- CreateIndex
CREATE INDEX "MessageTemplate_stage_isDefault_idx" ON "MessageTemplate"("stage", "isDefault");

-- CreateIndex
CREATE INDEX "MessageTemplate_applicationId_incidentTypeId_idx" ON "MessageTemplate"("applicationId", "incidentTypeId");

-- CreateIndex
CREATE INDEX "Incident_isOpen_currentColor_idx" ON "Incident"("isOpen", "currentColor");

-- CreateIndex
CREATE INDEX "Incident_applicationId_isOpen_idx" ON "Incident"("applicationId", "isOpen");

-- CreateIndex
CREATE UNIQUE INDEX "Incident_xurrentRequestId_isOpen_key" ON "Incident"("xurrentRequestId", "isOpen");

-- CreateIndex
CREATE INDEX "IncidentNotification_incidentId_stage_idx" ON "IncidentNotification"("incidentId", "stage");

-- CreateIndex
CREATE INDEX "IncidentNotification_createdAt_idx" ON "IncidentNotification"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_processed_createdAt_idx" ON "WebhookEvent"("processed", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_source_externalEventId_key" ON "WebhookEvent"("source", "externalEventId");

-- AddForeignKey
ALTER TABLE "NotificationGroupMember" ADD CONSTRAINT "NotificationGroupMember_notificationGroupId_fkey" FOREIGN KEY ("notificationGroupId") REFERENCES "NotificationGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationGroupRule" ADD CONSTRAINT "ApplicationGroupRule_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationGroupRule" ADD CONSTRAINT "ApplicationGroupRule_incidentTypeId_fkey" FOREIGN KEY ("incidentTypeId") REFERENCES "IncidentType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationGroupRule" ADD CONSTRAINT "ApplicationGroupRule_technicalGroupId_fkey" FOREIGN KEY ("technicalGroupId") REFERENCES "NotificationGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationGroupRule" ADD CONSTRAINT "ApplicationGroupRule_businessGroupId_fkey" FOREIGN KEY ("businessGroupId") REFERENCES "NotificationGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationGroupRule" ADD CONSTRAINT "ApplicationGroupRule_executiveGroupId_fkey" FOREIGN KEY ("executiveGroupId") REFERENCES "NotificationGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationGroupRule" ADD CONSTRAINT "ApplicationGroupRule_maintenanceGroupId_fkey" FOREIGN KEY ("maintenanceGroupId") REFERENCES "NotificationGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_incidentTypeId_fkey" FOREIGN KEY ("incidentTypeId") REFERENCES "IncidentType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_incidentTypeId_fkey" FOREIGN KEY ("incidentTypeId") REFERENCES "IncidentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentNotification" ADD CONSTRAINT "IncidentNotification_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentNotification" ADD CONSTRAINT "IncidentNotification_recipientGroupId_fkey" FOREIGN KEY ("recipientGroupId") REFERENCES "NotificationGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

