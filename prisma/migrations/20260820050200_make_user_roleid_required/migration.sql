-- Every user must have a platform role (class diagram: User 1 — Role).
-- Backfill any leftover NULL roleId to 'client', then require the column.

UPDATE "users"
SET "roleId" = (SELECT "id" FROM "roles" WHERE "name" = 'client' LIMIT 1)
WHERE "roleId" IS NULL;

ALTER TABLE "users" ALTER COLUMN "roleId" SET NOT NULL;
