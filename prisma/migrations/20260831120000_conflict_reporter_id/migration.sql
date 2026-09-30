-- Report association: involvedUserId → required reporterId (Conflict 0..* – 1 User)
ALTER TABLE "conflicts" RENAME COLUMN "involvedUserId" TO "reporterId";
ALTER TABLE "conflicts" ALTER COLUMN "reporterId" SET NOT NULL;
