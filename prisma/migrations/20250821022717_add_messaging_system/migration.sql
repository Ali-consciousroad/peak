/*
  Warnings:

  - You are about to drop the column `receiverId` on the `messages` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `messages` table. All the data in the column will be lost.
  - Added the required column `conversationId` to the `messages` table without a default value. This is not possible if the table is not empty.

*/

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_participants" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastReadAt" TIMESTAMP(3),

    CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conversation_participants_conversationId_userId_key" ON "conversation_participants"("conversationId", "userId");

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Handle existing messages by creating a default conversation
INSERT INTO "conversations" ("id", "createdAt", "updatedAt") 
VALUES ('legacy-conversation', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Add new columns to messages table
ALTER TABLE "messages" ADD COLUMN "attachmentUrl" TEXT;
ALTER TABLE "messages" ADD COLUMN "conversationId" TEXT NOT NULL DEFAULT 'legacy-conversation';
ALTER TABLE "messages" ADD COLUMN "isRead" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "messages" ADD COLUMN "messageType" TEXT NOT NULL DEFAULT 'text';
ALTER TABLE "messages" ADD COLUMN "replyToId" TEXT;

-- Add participants to the legacy conversation for existing messages
INSERT INTO "conversation_participants" ("id", "conversationId", "userId", "isActive", "lastReadAt")
SELECT 
    gen_random_uuid()::text,
    'legacy-conversation',
    "senderId",
    true,
    NULL
FROM "messages"
WHERE "senderId" IS NOT NULL
GROUP BY "senderId";

INSERT INTO "conversation_participants" ("id", "conversationId", "userId", "isActive", "lastReadAt")
SELECT 
    gen_random_uuid()::text,
    'legacy-conversation',
    "receiverId",
    true,
    NULL
FROM "messages"
WHERE "receiverId" IS NOT NULL
GROUP BY "receiverId";

-- Remove default constraint and drop old columns
ALTER TABLE "messages" ALTER COLUMN "conversationId" DROP DEFAULT;
ALTER TABLE "messages" DROP COLUMN "receiverId";
ALTER TABLE "messages" DROP COLUMN "status";

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
