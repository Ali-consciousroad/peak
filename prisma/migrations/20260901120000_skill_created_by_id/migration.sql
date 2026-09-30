-- Create Skill 0..* – 0..1 User (optional createdById; no backfill)
ALTER TABLE "skills" ADD COLUMN "createdById" TEXT;

ALTER TABLE "skills" ADD CONSTRAINT "skills_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
