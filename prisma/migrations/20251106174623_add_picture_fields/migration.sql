-- AlterTable
ALTER TABLE "users" ADD COLUMN "picture" TEXT;

-- AlterTable
ALTER TABLE "portfolios" ADD COLUMN "picture" TEXT[];

-- Update existing portfolios to have empty array instead of NULL
UPDATE "portfolios" SET "picture" = '{}' WHERE "picture" IS NULL;

