-- Drop unused smart_contracts table (V1 escrow/crypto uses payments only)
ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_smartContractId_fkey";
ALTER TABLE "reviews" DROP COLUMN IF EXISTS "smartContractId";
DROP TABLE IF EXISTS "smart_contracts";
