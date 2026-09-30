-- Drop unused Mission.autoRefundEnabled (always true in V1; not a real auto-refund)
ALTER TABLE "missions" DROP COLUMN "autoRefundEnabled";
