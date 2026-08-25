-- Licence V2 : identifiant public unique, indépendant du contenu commercial.
ALTER TABLE "license_records" ADD COLUMN "public_id" UUID;
UPDATE "license_records" SET "public_id" = gen_random_uuid() WHERE "public_id" IS NULL;
ALTER TABLE "license_records" ALTER COLUMN "public_id" SET NOT NULL;
ALTER TABLE "license_records" ALTER COLUMN "public_id" SET DEFAULT gen_random_uuid();
ALTER TABLE "license_records" ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE UNIQUE INDEX "license_records_public_id_key" ON "license_records"("public_id");
