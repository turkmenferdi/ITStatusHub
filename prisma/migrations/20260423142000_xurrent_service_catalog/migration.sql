CREATE TABLE "ExternalServiceCatalogItem" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalServiceId" TEXT NOT NULL,
    "externalServiceName" TEXT NOT NULL,
    "sourceServiceName" TEXT,
    "environment" TEXT,
    "suggestedApplicationId" TEXT,
    "rawJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalServiceCatalogItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExternalServiceCatalogItem_source_externalServiceId_key" ON "ExternalServiceCatalogItem"("source", "externalServiceId");
CREATE INDEX "ExternalServiceCatalogItem_source_externalServiceName_idx" ON "ExternalServiceCatalogItem"("source", "externalServiceName");
CREATE INDEX "ExternalServiceCatalogItem_suggestedApplicationId_idx" ON "ExternalServiceCatalogItem"("suggestedApplicationId");

ALTER TABLE "ExternalServiceCatalogItem" ADD CONSTRAINT "ExternalServiceCatalogItem_suggestedApplicationId_fkey" FOREIGN KEY ("suggestedApplicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
