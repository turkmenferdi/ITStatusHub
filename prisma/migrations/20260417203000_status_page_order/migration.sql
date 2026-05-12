ALTER TABLE "Application" ADD COLUMN "statusPageOrder" INTEGER NOT NULL DEFAULT 0;

UPDATE "Application"
SET "statusPageOrder" = ordered.row_number
FROM (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "name" ASC)::INTEGER AS row_number
  FROM "Application"
) AS ordered
WHERE "Application"."id" = ordered."id";

CREATE INDEX "Application_statusPageOrder_idx" ON "Application"("statusPageOrder");
