# Clinical Documentation — Current State (As-Is) Reverse-Engineering Audit

**Status:** NOT STARTED
**Audit Date:** 2026-07-09
**Module:** Clinical Documentation
**Scope:** Complete reverse-engineering of the Clinical Documentation workflow

---

## Executive Summary

> **Note:** This document has not been produced yet. It should be created by applying the same audit process used for Patient Intake to the Clinical Documentation module.

**Template:** Follow the structure in `architecture/01-current-state/patient-intake.md`

---

## Preliminary Observations (From Codebase Exploration)

Based on file structure and Prisma schema:

- Clinical notes stored in `clinical_note` table
- Clinical note types: GENERAL, ASSESSMENT, PROGRESS, PROCEDURE, FOLLOW_UP, REFERRAL
- Clinical notes can be pinned (`is_pinned`)
- Clinical notes linked to Patient, Doctor (User), and optionally Appointment
- Medical records stored in `medical_record` table
- Medical records contain: treatment_plan, prescriptions, lab_request, notes
- Medical records linked to Patient, Doctor, Appointment
- Vital signs stored in `vital_sign` table
- Vital signs linked to Patient and optionally Appointment/MedicalRecord
- Care notes stored in `care_note` table (nursing)
- Care note types: PRE_OP, POST_OP, GENERAL
- Diagnoses stored in `diagnosis` table
- Lab tests stored in `lab_test` table
- Clinical form responses stored in `clinical_form_response` table

---

## Required Analysis

1. **Complete flow trace** from note creation to archival
2. **State machine** for clinical note/document lifecycle
3. **Database analysis** of all clinical tables
4. **Validation pipeline** for clinical data entry
5. **Authorization matrix** for clinical documentation
6. **UI journey** through clinical screens
7. **Decision points** (note signing, form completion)
8. **Event candidates** for outbox pattern
9. **Hidden business rules** (pinning, versioning, consent)
10. **Failure paths** (unsigned notes, incomplete forms)

---

## Next Steps

1. Assign architect to conduct full audit
2. Use `patient-intake.md` as template
3. Produce all 15 deliverables
4. Review with doctors, nurses, and clinical staff
