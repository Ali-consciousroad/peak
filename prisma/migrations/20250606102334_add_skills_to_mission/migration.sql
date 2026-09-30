-- AlterTable
ALTER TABLE "missions" ADD COLUMN     "skills" TEXT[] DEFAULT ARRAY[]::TEXT[];
