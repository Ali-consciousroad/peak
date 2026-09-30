-- Offers are always client-initiated (Malt). initiatedBy is not on the class diagram.
ALTER TABLE "offers" DROP COLUMN IF EXISTS "initiatedBy";
