-- Enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LegalDocumentType') THEN
    CREATE TYPE "LegalDocumentType" AS ENUM ('TERMS','PRIVACY');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Language') THEN
    CREATE TYPE "Language" AS ENUM ('UZ','RU','EN');
  END IF;
END $$;

-- Tables
CREATE TABLE IF NOT EXISTS "LegalDocument" (
  "id" SERIAL PRIMARY KEY,
  "type" "LegalDocumentType" NOT NULL,
  "version" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "LegalDocument_type_idx" ON "LegalDocument" ("type");

CREATE TABLE IF NOT EXISTS "LegalTranslation" (
  "id" SERIAL PRIMARY KEY,
  "documentId" INTEGER NOT NULL REFERENCES "LegalDocument"("id") ON DELETE CASCADE,
  "language" "Language" NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "LegalTranslation_documentId_language_key" ON "LegalTranslation" ("documentId","language");
CREATE INDEX IF NOT EXISTS "LegalTranslation_language_idx" ON "LegalTranslation" ("language");

-- Trigger to update updatedAt
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_legaldocument_updated_at'
  ) THEN
    CREATE TRIGGER trg_legaldocument_updated_at
    BEFORE UPDATE ON "LegalDocument"
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
  END IF;
END $$;
