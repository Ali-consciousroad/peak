/*
  Warnings:

  - Made the column `messageId` on table `messages` required. This step will fail if there are existing NULL values in that column.

*/

-- First, populate NULL values with UUIDs
UPDATE "public"."messages" SET "messageId" = gen_random_uuid() WHERE "messageId" IS NULL;

-- Then make the column required
ALTER TABLE "public"."messages" ALTER COLUMN "messageId" SET NOT NULL;
