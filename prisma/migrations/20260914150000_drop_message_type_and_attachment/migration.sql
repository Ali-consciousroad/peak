-- Unused in v1 (text-only chat). Not on the paper class diagram.
ALTER TABLE "messages" DROP COLUMN IF EXISTS "attachmentUrl";
ALTER TABLE "messages" DROP COLUMN IF EXISTS "messageType";
