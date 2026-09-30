-- Copy leftover walletAddress into cryptoWalletAddress, then drop the old column.
UPDATE "users"
SET "cryptoWalletAddress" = "walletAddress"
WHERE ("cryptoWalletAddress" IS NULL OR "cryptoWalletAddress" = '')
  AND "walletAddress" IS NOT NULL
  AND "walletAddress" <> '';

ALTER TABLE "users" DROP COLUMN "walletAddress";
