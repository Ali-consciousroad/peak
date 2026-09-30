-- AlterTable (idempotent: DBs that never had isRead skip the drop)
ALTER TABLE "offers" DROP COLUMN IF EXISTS "isRead";
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "seenByFreelancerAt" TIMESTAMP(3);

