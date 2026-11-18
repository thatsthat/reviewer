/*
  Warnings:

  - Made the column `url` on table `apple` required. This step will fail if there are existing NULL values in that column.
  - Made the column `url` on table `google` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "apple" ALTER COLUMN "url" SET NOT NULL;

-- AlterTable
ALTER TABLE "google" ALTER COLUMN "url" SET NOT NULL;
