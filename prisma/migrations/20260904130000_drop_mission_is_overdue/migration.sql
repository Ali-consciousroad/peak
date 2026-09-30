-- Drop redundant Mission.isOverdue (OVERDUE is already missions.status)
ALTER TABLE "missions" DROP COLUMN "isOverdue";
