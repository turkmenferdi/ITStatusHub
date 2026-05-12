CREATE TABLE "ApplicationDependency" (
    "id" TEXT NOT NULL,
    "upstreamApplicationId" TEXT NOT NULL,
    "downstreamApplicationId" TEXT NOT NULL,
    "moduleName" TEXT NOT NULL,
    "integrationName" TEXT NOT NULL,
    "impactDescription" TEXT NOT NULL,
    "impactLevel" "StatusColor" NOT NULL DEFAULT 'yellow',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationDependency_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ApplicationDependency_upstreamApplicationId_downstreamApplicationId_moduleName_integrationName_key" ON "ApplicationDependency"("upstreamApplicationId", "downstreamApplicationId", "moduleName", "integrationName");
CREATE INDEX "ApplicationDependency_upstreamApplicationId_isActive_idx" ON "ApplicationDependency"("upstreamApplicationId", "isActive");
CREATE INDEX "ApplicationDependency_downstreamApplicationId_isActive_idx" ON "ApplicationDependency"("downstreamApplicationId", "isActive");

ALTER TABLE "ApplicationDependency" ADD CONSTRAINT "ApplicationDependency_upstreamApplicationId_fkey" FOREIGN KEY ("upstreamApplicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApplicationDependency" ADD CONSTRAINT "ApplicationDependency_downstreamApplicationId_fkey" FOREIGN KEY ("downstreamApplicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
