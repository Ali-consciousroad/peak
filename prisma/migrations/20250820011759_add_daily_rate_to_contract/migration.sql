-- Add dailyRate column as nullable first
ALTER TABLE "contracts" ADD COLUMN "dailyRate" DECIMAL(10,2);

-- Update existing contracts with the mission's daily rate
UPDATE "contracts" 
SET "dailyRate" = (
  SELECT "dailyRate" 
  FROM "missions" 
  WHERE "missions"."id" = "contracts"."missionId"
);

-- Make the column NOT NULL after updating existing records
ALTER TABLE "contracts" ALTER COLUMN "dailyRate" SET NOT NULL;
