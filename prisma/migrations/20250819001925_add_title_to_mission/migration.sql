-- Add title column with default value for existing records
ALTER TABLE "missions" ADD COLUMN "title" TEXT;

-- Update existing records with a default title based on description
UPDATE "missions" SET "title" = CASE 
  WHEN LENGTH("description") > 50 THEN LEFT("description", 50) || '...'
  ELSE "description"
END;

-- Make the column NOT NULL after updating existing records
ALTER TABLE "missions" ALTER COLUMN "title" SET NOT NULL;
