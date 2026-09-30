-- Drop leftover users.skill (free-text). Skills live in skills + _UserSkills (Possess).
ALTER TABLE "users" DROP COLUMN IF EXISTS "skill";
