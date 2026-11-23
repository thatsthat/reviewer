-- CreateTable
CREATE TABLE "labels" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_labels" (
    "app_id" INTEGER NOT NULL,
    "label_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_labels_pkey" PRIMARY KEY ("app_id","label_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "labels_name_key_key" ON "labels"("name_key");

-- CreateIndex
CREATE INDEX "app_labels_label_id_idx" ON "app_labels"("label_id");

-- AddForeignKey
ALTER TABLE "app_labels" ADD CONSTRAINT "app_labels_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_labels" ADD CONSTRAINT "app_labels_label_id_fkey" FOREIGN KEY ("label_id") REFERENCES "labels"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
