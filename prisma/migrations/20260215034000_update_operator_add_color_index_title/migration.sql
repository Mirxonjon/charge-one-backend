-- Add optional color column and index on title
ALTER TABLE "Operator" ADD COLUMN IF NOT EXISTS "color" TEXT;

-- Create index on title if not exists (idempotent for Postgres 9.5+)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = ANY(current_schemas(false)) AND indexname = 'Operator_title_idx'
  ) THEN
    CREATE INDEX "Operator_title_idx" ON "Operator" ("title");
  END IF;
END $$;