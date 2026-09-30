/*
  Warnings:

  - A unique constraint covering the columns `[messageId]` on the table `messages` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."messages" ADD COLUMN     "messageId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "messages_messageId_key" ON "public"."messages"("messageId");
