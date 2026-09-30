-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "missionId" TEXT,
ADD COLUMN     "smartContractId" TEXT;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "missions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_smartContractId_fkey" FOREIGN KEY ("smartContractId") REFERENCES "smart_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
