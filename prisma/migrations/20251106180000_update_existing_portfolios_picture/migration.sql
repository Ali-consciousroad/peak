-- Update existing portfolios to have empty array instead of NULL
UPDATE "portfolios" SET "picture" = '{}' WHERE "picture" IS NULL;


