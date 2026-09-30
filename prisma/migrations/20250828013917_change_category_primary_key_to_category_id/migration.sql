/*
  Warnings:

  - The primary key for the `categories` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `categories` table. All the data in the column will be lost.
  - Made the column `categoryId` on table `categories` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "_CategoryToMission" DROP CONSTRAINT "_CategoryToMission_A_fkey";

-- DropIndex
DROP INDEX "categories_categoryId_key";

-- AlterTable
ALTER TABLE "categories" DROP CONSTRAINT "categories_pkey",
DROP COLUMN "id",
ALTER COLUMN "categoryId" SET NOT NULL,
ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("categoryId");

-- AddForeignKey
ALTER TABLE "_CategoryToMission" ADD CONSTRAINT "_CategoryToMission_A_fkey" FOREIGN KEY ("A") REFERENCES "categories"("categoryId") ON DELETE CASCADE ON UPDATE CASCADE;
