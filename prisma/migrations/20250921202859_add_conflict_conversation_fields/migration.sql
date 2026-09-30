-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "conflictId" TEXT,
ADD COLUMN     "type" TEXT DEFAULT 'general';

-- AlterTable
ALTER TABLE "offers" ADD COLUMN     "isRead" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_conflictId_fkey" FOREIGN KEY ("conflictId") REFERENCES "conflicts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
