/*
  Warnings:

  - A unique constraint covering the columns `[clerkId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `clerkId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- First add the column as nullable
ALTER TABLE "User" ADD COLUMN "clerkId" TEXT;

-- Create the unique index
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- Update existing users with a temporary clerkId
UPDATE "User" SET "clerkId" = 'temp_' || id WHERE "clerkId" IS NULL;

-- Now make the column required
ALTER TABLE "User" ALTER COLUMN "clerkId" SET NOT NULL;
