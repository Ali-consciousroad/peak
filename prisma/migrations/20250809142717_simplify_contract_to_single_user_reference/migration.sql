/*
  Warnings:

  - You are about to drop the column `clientId` on the `contracts` table. All the data in the column will be lost.
  - Added the required column `userId` to the `contracts` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_clientId_fkey";

-- AlterTable
ALTER TABLE "contracts" DROP COLUMN "clientId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
