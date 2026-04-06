-- AddColumn: kra_pin to Vendor
ALTER TABLE "Vendor" ADD COLUMN "kra_pin" VARCHAR(20);

-- AddColumn: etims_registered to Vendor
ALTER TABLE "Vendor" ADD COLUMN "etims_registered" BOOLEAN NOT NULL DEFAULT false;

-- Create index on kra_pin for quick lookups
CREATE INDEX "idx_vendor_kra_pin" ON "Vendor"("kra_pin");
