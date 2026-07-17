# Surgical Management — Current State (As-Is) Reverse-Engineering Audit

**Status:** NOT STARTED
**Audit Date:** 2026-07-09
**Module:** Surgical Management
**Scope:** Complete reverse-engineering of the Surgical workflow

---

## Executive Summary

> **Note:** This document has not been produced yet. It should be created by applying the same audit process used for Patient Intake to the Surgical Management module.

**Template:** Follow the structure in `architecture/01-current-state/patient-intake.md`

---

## Preliminary Observations (From Codebase Exploration)

Based on file structure and Prisma schema:

- Surgical cases stored in `surgical_case` table
- Surgical case statuses: DRAFT, PLANNING, READY_FOR_SCHEDULING, SCHEDULED, IN_PREP, IN_THEATER, RECOVERY, COMPLETED, CANCELLED, etc.
- Surgical case linked to Patient, Appointment, Consultation, Primary Surgeon
- Case plans stored in `case_plan` table with readiness status
- Consent forms stored in `consent_form` table with signing workflow
- Surgical procedure records stored in `surgical_procedure_record` table
- Theater bookings stored in `theater_booking` table
- Surgical checklists stored in `surgical_checklist` table
- Surgical billing estimates stored in `surgical_billing_estimate` table
- Surgical staff assignments stored in `surgical_staff` table

---

## Required Analysis

1. **Complete flow trace** from case creation to completion
2. **State machine** for surgical case statuses
3. **Database analysis** of all surgical tables
4. **Validation pipeline** for surgical operations
5. **Authorization matrix** for surgical workflows
6. **UI journey** through surgical screens
7. **Decision points** (readiness, scheduling, consent)
8. **Event candidates** for outbox pattern
9. **Hidden business rules** (checklist phases, consent requirements)
10. **Failure paths** (theater conflict, consent missing)

---

## Next Steps

1. Assign architect to conduct full audit
2. Use `patient-intake.md` as template
3. Produce all 15 deliverables
4. Review with surgeons, anesthesiologists, and theater staff
