/*
  Warnings:

  - Added the required column `freelanceId` to the `contracts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "contracts" ADD COLUMN     "freelanceId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_freelanceId_fkey" FOREIGN KEY ("freelanceId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
