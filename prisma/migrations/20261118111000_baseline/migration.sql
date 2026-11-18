-- Baseline: brings migration history in line with the database, which was
-- changed with `prisma db push` after the initial migration.

-- DropTable
DROP TABLE "Todo";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "apple" (
    "app_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT,
    "icon_url" TEXT,
    "scraped_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" JSONB NOT NULL,

    CONSTRAINT "apple_pkey" PRIMARY KEY ("app_id")
);

-- CreateTable
CREATE TABLE "google" (
    "app_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT,
    "icon_url" TEXT,
    "scraped_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" JSONB NOT NULL,

    CONSTRAINT "google_pkey" PRIMARY KEY ("app_id")
);

-- CreateTable
CREATE TABLE "apps" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "apps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apps_apple_links" (
    "apple_app_id" TEXT NOT NULL,
    "app_id" INTEGER NOT NULL,

    CONSTRAINT "apps_apple_links_pkey" PRIMARY KEY ("apple_app_id")
);

-- CreateTable
CREATE TABLE "apps_google_links" (
    "google_app_id" TEXT NOT NULL,
    "app_id" INTEGER NOT NULL,

    CONSTRAINT "apps_google_links_pkey" PRIMARY KEY ("google_app_id")
);

-- CreateIndex
CREATE INDEX "apps_apple_links_app_id_idx" ON "apps_apple_links"("app_id");

-- CreateIndex
CREATE INDEX "apps_google_links_app_id_idx" ON "apps_google_links"("app_id");

-- AddForeignKey
ALTER TABLE "apps_apple_links" ADD CONSTRAINT "apps_apple_links_apple_app_id_fkey" FOREIGN KEY ("apple_app_id") REFERENCES "apple"("app_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "apps_apple_links" ADD CONSTRAINT "apps_apple_links_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "apps_google_links" ADD CONSTRAINT "apps_google_links_google_app_id_fkey" FOREIGN KEY ("google_app_id") REFERENCES "google"("app_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "apps_google_links" ADD CONSTRAINT "apps_google_links_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

