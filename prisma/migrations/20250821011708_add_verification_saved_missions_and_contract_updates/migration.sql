/*
  Warnings:

  - You are about to drop the column `userId` on the `contracts` table. All the data in the column will be lost.
  - Added the required column `adminId` to the `contracts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `freelancerId` to the `contracts` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_userId_fkey";

-- AlterTable
ALTER TABLE "contracts" DROP COLUMN "userId",
ADD COLUMN     "adminId" TEXT NOT NULL,
ADD COLUMN     "freelancerId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "missions" ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "verifierId" TEXT;

-- CreateTable
CREATE TABLE "saved_missions" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,

    CONSTRAINT "saved_missions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "saved_missions_userId_missionId_key" ON "saved_missions"("userId", "missionId");

-- AddForeignKey
ALTER TABLE "missions" ADD CONSTRAINT "missions_verifierId_fkey" FOREIGN KEY ("verifierId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_missions" ADD CONSTRAINT "saved_missions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_missions" ADD CONSTRAINT "saved_missions_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "missions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
