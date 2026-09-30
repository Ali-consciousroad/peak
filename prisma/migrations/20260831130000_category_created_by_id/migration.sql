-- Create Category 0..* – 0..1 User (optional createdById; no backfill)
ALTER TABLE "categories" ADD COLUMN "createdById" TEXT;

ALTER TABLE "categories" ADD CONSTRAINT "categories_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
