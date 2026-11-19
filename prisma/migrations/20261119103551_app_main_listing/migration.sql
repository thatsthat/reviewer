-- CreateEnum
CREATE TYPE "Store" AS ENUM ('google', 'apple');

-- AlterTable
ALTER TABLE "apple" ADD COLUMN     "updated_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "google" ADD COLUMN     "updated_at" TIMESTAMPTZ;

-- AlterTable (nullable first; made required after the backfill)
ALTER TABLE "apps" ADD COLUMN     "primary_store" "Store",
ADD COLUMN     "primary_store_app_id" TEXT;

-- Backfill each app's main listing: Google before Apple, then title, then store app id
UPDATE "apps" a
SET "primary_store" = f.store::"Store",
    "primary_store_app_id" = f.store_app_id
FROM (
  SELECT DISTINCT ON (app_id) app_id, store, store_app_id FROM (
    SELECT l.app_id, 'google' AS store, 0 AS rank, g.app_id AS store_app_id, g.title
      FROM "apps_google_links" l JOIN "google" g ON g.app_id = l.google_app_id
    UNION ALL
    SELECT l.app_id, 'apple' AS store, 1 AS rank, p.app_id AS store_app_id, p.title
      FROM "apps_apple_links" l JOIN "apple" p ON p.app_id = l.apple_app_id
  ) u
  ORDER BY app_id, rank, title COLLATE "en-x-icu", store_app_id COLLATE "C"
) f
WHERE a.id = f.app_id;

ALTER TABLE "apps" ALTER COLUMN "primary_store" SET NOT NULL,
ALTER COLUMN "primary_store_app_id" SET NOT NULL;

-- Backfill the stores' own last-updated dates from the saved store data
UPDATE "google"
SET "updated_at" = to_timestamp(("data"->>'updated')::bigint / 1000.0)
WHERE jsonb_typeof("data"->'updated') = 'number';

UPDATE "apple"
SET "updated_at" = ("data"->>'updated')::timestamptz
WHERE jsonb_typeof("data"->'updated') = 'string' AND "data"->>'updated' <> '';
