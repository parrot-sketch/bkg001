-- Performance indexes for hot query paths
-- Aligned to dayboard, doctor case list, and clinical form lookups

-- SurgicalCase: doctor case list with status filter + sort by updated_at
CREATE INDEX "SurgicalCase_primary_surgeon_id_status_updated_at_idx"
    ON "SurgicalCase" ("primary_surgeon_id", "status", "updated_at");

-- TheaterBooking: dayboard date-range query (start_time >= X AND start_time < Y AND status != CANCELLED)
CREATE INDEX "TheaterBooking_start_time_status_idx"
    ON "TheaterBooking" ("start_time", "status");

-- TheaterBooking: theater-specific schedule queries
CREATE INDEX "TheaterBooking_theater_id_start_time_idx"
    ON "TheaterBooking" ("theater_id", "start_time");

-- ClinicalFormResponse: dayboard + form lookup by case + template + status
CREATE INDEX "ClinicalFormResponse_surgical_case_id_template_key_status_idx"
    ON "ClinicalFormResponse" ("surgical_case_id", "template_key", "status");

-- ClinicalFormResponse: form queries by type + status (e.g., "all final preop forms")
CREATE INDEX "ClinicalFormResponse_template_key_status_idx"
    ON "ClinicalFormResponse" ("template_key", "status");
