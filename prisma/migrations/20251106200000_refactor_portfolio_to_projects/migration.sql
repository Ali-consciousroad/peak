-- Create projects table
CREATE TABLE IF NOT EXISTS "projects" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "url" VARCHAR(255),
    "picture" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "portfolioId" TEXT NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint on portfolios.userId if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'portfolios_userId_key'
    ) THEN
        ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_userId_key" UNIQUE ("userId");
    END IF;
END $$;

-- Migrate existing portfolio data to projects (column names differ by migration history)
DO $$
DECLARE
    portfolio_record RECORD;
    project_id TEXT;
    has_project_name BOOLEAN;
    has_name BOOLEAN;
    has_url BOOLEAN;
    has_picture BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'portfolios' AND column_name = 'projectName'
    ) INTO has_project_name;
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'portfolios' AND column_name = 'name'
    ) INTO has_name;
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'portfolios' AND column_name = 'url'
    ) INTO has_url;
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'portfolios' AND column_name = 'picture'
    ) INTO has_picture;

    IF has_project_name THEN
        IF has_url AND has_picture THEN
            FOR portfolio_record IN
                SELECT id, "projectName" AS p_title, url, picture
                FROM portfolios
                WHERE "projectName" IS NOT NULL OR url IS NOT NULL
            LOOP
                project_id := gen_random_uuid()::TEXT;
                INSERT INTO "projects" (
                    id, name, description, url, picture, "createdAt", "updatedAt", "portfolioId"
                ) VALUES (
                    project_id,
                    COALESCE(portfolio_record.p_title, 'Untitled Project'),
                    NULL,
                    portfolio_record.url,
                    COALESCE(portfolio_record.picture, ARRAY[]::TEXT[]),
                    NOW(),
                    NOW(),
                    portfolio_record.id
                );
            END LOOP;
        ELSIF has_picture THEN
            FOR portfolio_record IN
                SELECT id, "projectName" AS p_title, picture
                FROM portfolios
                WHERE "projectName" IS NOT NULL
            LOOP
                project_id := gen_random_uuid()::TEXT;
                INSERT INTO "projects" (
                    id, name, description, url, picture, "createdAt", "updatedAt", "portfolioId"
                ) VALUES (
                    project_id,
                    COALESCE(portfolio_record.p_title, 'Untitled Project'),
                    NULL,
                    NULL,
                    COALESCE(portfolio_record.picture, ARRAY[]::TEXT[]),
                    NOW(),
                    NOW(),
                    portfolio_record.id
                );
            END LOOP;
        ELSIF has_url THEN
            FOR portfolio_record IN
                SELECT id, "projectName" AS p_title, url
                FROM portfolios
                WHERE "projectName" IS NOT NULL OR url IS NOT NULL
            LOOP
                project_id := gen_random_uuid()::TEXT;
                INSERT INTO "projects" (
                    id, name, description, url, picture, "createdAt", "updatedAt", "portfolioId"
                ) VALUES (
                    project_id,
                    COALESCE(portfolio_record.p_title, 'Untitled Project'),
                    NULL,
                    portfolio_record.url,
                    ARRAY[]::TEXT[],
                    NOW(),
                    NOW(),
                    portfolio_record.id
                );
            END LOOP;
        ELSE
            FOR portfolio_record IN
                SELECT id, "projectName" AS p_title
                FROM portfolios
                WHERE "projectName" IS NOT NULL
            LOOP
                project_id := gen_random_uuid()::TEXT;
                INSERT INTO "projects" (
                    id, name, description, url, picture, "createdAt", "updatedAt", "portfolioId"
                ) VALUES (
                    project_id,
                    COALESCE(portfolio_record.p_title, 'Untitled Project'),
                    NULL,
                    NULL,
                    ARRAY[]::TEXT[],
                    NOW(),
                    NOW(),
                    portfolio_record.id
                );
            END LOOP;
        END IF;
    ELSIF has_name THEN
        -- e.g. schema used `name` on portfolios but never had `projectName`
        IF has_url AND has_picture THEN
            FOR portfolio_record IN
                SELECT id, name AS p_title, url, picture
                FROM portfolios
                WHERE name IS NOT NULL OR url IS NOT NULL
            LOOP
                project_id := gen_random_uuid()::TEXT;
                INSERT INTO "projects" (
                    id, name, description, url, picture, "createdAt", "updatedAt", "portfolioId"
                ) VALUES (
                    project_id,
                    COALESCE(portfolio_record.p_title, 'Untitled Project'),
                    NULL,
                    portfolio_record.url,
                    COALESCE(portfolio_record.picture, ARRAY[]::TEXT[]),
                    NOW(),
                    NOW(),
                    portfolio_record.id
                );
            END LOOP;
        ELSIF has_url THEN
            FOR portfolio_record IN
                SELECT id, name AS p_title, url
                FROM portfolios
                WHERE name IS NOT NULL OR url IS NOT NULL
            LOOP
                project_id := gen_random_uuid()::TEXT;
                INSERT INTO "projects" (
                    id, name, description, url, picture, "createdAt", "updatedAt", "portfolioId"
                ) VALUES (
                    project_id,
                    COALESCE(portfolio_record.p_title, 'Untitled Project'),
                    NULL,
                    portfolio_record.url,
                    ARRAY[]::TEXT[],
                    NOW(),
                    NOW(),
                    portfolio_record.id
                );
            END LOOP;
        ELSIF has_picture THEN
            FOR portfolio_record IN
                SELECT id, name AS p_title, picture
                FROM portfolios
                WHERE name IS NOT NULL
            LOOP
                project_id := gen_random_uuid()::TEXT;
                INSERT INTO "projects" (
                    id, name, description, url, picture, "createdAt", "updatedAt", "portfolioId"
                ) VALUES (
                    project_id,
                    COALESCE(portfolio_record.p_title, 'Untitled Project'),
                    NULL,
                    NULL,
                    COALESCE(portfolio_record.picture, ARRAY[]::TEXT[]),
                    NOW(),
                    NOW(),
                    portfolio_record.id
                );
            END LOOP;
        ELSE
            FOR portfolio_record IN
                SELECT id, name AS p_title
                FROM portfolios
                WHERE name IS NOT NULL
            LOOP
                project_id := gen_random_uuid()::TEXT;
                INSERT INTO "projects" (
                    id, name, description, url, picture, "createdAt", "updatedAt", "portfolioId"
                ) VALUES (
                    project_id,
                    COALESCE(portfolio_record.p_title, 'Untitled Project'),
                    NULL,
                    NULL,
                    ARRAY[]::TEXT[],
                    NOW(),
                    NOW(),
                    portfolio_record.id
                );
            END LOOP;
        END IF;
    END IF;
END $$;

-- Drop old columns from portfolios table
ALTER TABLE "portfolios" DROP COLUMN IF EXISTS "projectName";
ALTER TABLE "portfolios" DROP COLUMN IF EXISTS "url";
ALTER TABLE "portfolios" DROP COLUMN IF EXISTS "picture";

-- Add foreign key constraint for projects.portfolioId
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'projects_portfolioId_fkey'
    ) THEN
        ALTER TABLE "projects" ADD CONSTRAINT "projects_portfolioId_fkey" 
        FOREIGN KEY ("portfolioId") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Create index on portfolioId for better query performance
CREATE INDEX IF NOT EXISTS "projects_portfolioId_idx" ON "projects"("portfolioId");

