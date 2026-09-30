/*
  Warnings:

  - You are about to drop the `_CategoryToSmartContract` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_CategoryToSmartContract" DROP CONSTRAINT "_CategoryToSmartContract_A_fkey";

-- DropForeignKey
ALTER TABLE "_CategoryToSmartContract" DROP CONSTRAINT "_CategoryToSmartContract_B_fkey";

-- DropTable
DROP TABLE "_CategoryToSmartContract";

-- CreateTable
CREATE TABLE "_CategoryToMission" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CategoryToMission_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_CategoryToMission_B_index" ON "_CategoryToMission"("B");

-- AddForeignKey
ALTER TABLE "_CategoryToMission" ADD CONSTRAINT "_CategoryToMission_A_fkey" FOREIGN KEY ("A") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryToMission" ADD CONSTRAINT "_CategoryToMission_B_fkey" FOREIGN KEY ("B") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
