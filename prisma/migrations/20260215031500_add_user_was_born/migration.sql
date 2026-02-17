-- Add wasBorn column to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "wasBorn" TIMESTAMP(3);
