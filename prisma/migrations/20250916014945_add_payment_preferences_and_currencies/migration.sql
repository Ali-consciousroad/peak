/*
  Warnings:

  - You are about to drop the column `currency` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `proficiencyLevel` on the `skills` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `_ServiceToSkill` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `services` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `category` to the `skills` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_ServiceToSkill" DROP CONSTRAINT "_ServiceToSkill_A_fkey";

-- DropForeignKey
ALTER TABLE "_ServiceToSkill" DROP CONSTRAINT "_ServiceToSkill_B_fkey";

-- DropForeignKey
ALTER TABLE "services" DROP CONSTRAINT "services_userId_fkey";

-- AlterTable
ALTER TABLE "conflicts" ADD COLUMN     "assignedAdminId" TEXT;

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "missionId" TEXT;

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'sent';

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "currency",
ADD COLUMN     "conversionRate" DECIMAL(15,8),
ADD COLUMN     "cryptoAmount" DECIMAL(20,8),
ADD COLUMN     "cryptoCurrency" TEXT,
ADD COLUMN     "cryptoTransactionHash" TEXT,
ADD COLUMN     "cryptoWalletAddress" TEXT,
ADD COLUMN     "currencyId" TEXT;

-- AlterTable
ALTER TABLE "skills" DROP COLUMN "proficiencyLevel",
ADD COLUMN     "category" VARCHAR(100) NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "role",
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "cryptoWalletAddress" TEXT,
ADD COLUMN     "dailyRate" DECIMAL(10,2),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "preferredPaymentMethod" TEXT DEFAULT 'EUR',
ADD COLUMN     "roleId" TEXT;

-- DropTable
DROP TABLE "_ServiceToSkill";

-- DropTable
DROP TABLE "services";

-- DropEnum
DROP TYPE "ProficiencyLevel";

-- CreateTable
CREATE TABLE "currencies" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "currencies_code_key" ON "currencies"("code");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conflicts" ADD CONSTRAINT "conflicts_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "missions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
