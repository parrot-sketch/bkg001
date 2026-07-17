# Appointments — Current State (As-Is) Reverse-Engineering Audit

**Status:** NOT STARTED
**Audit Date:** 2026-07-09
**Module:** Appointment Management
**Scope:** Complete reverse-engineering of the Appointment workflow

---

## Executive Summary

> **Note:** This document has not been produced yet. It should be created by applying the same audit process used for Patient Intake to the Appointment module.

**Template:** Follow the structure in `architecture/01-current-state/patient-intake.md`

---

## Preliminary Observations (From Codebase Exploration)

Based on file structure and Prisma schema:

- Appointments are created via `app/api/appointments/route.ts` (POST)
- Appointment statuses: PENDING, PENDING_DOCTOR_CONFIRMATION, CONFIRMED, SCHEDULED, CANCELLED, COMPLETED, NO_SHOW, CHECKED_IN, READY_FOR_CONSULTATION, IN_CONSULTATION
- Appointments link Patient, Doctor, and Consultation
- Appointment sources: PATIENT_REQUESTED, FRONTDESK_SCHEDULED, DOCTOR_FOLLOW_UP, ADMIN_SCHEDULED
- Appointment has `consultation_request_status` for consultation workflow
- Frontdesk can check in patients, mark late arrivals, mark no-shows
- Doctors can confirm appointments
- Appointments can have follow-up chains via `parent_appointment_id`

---

## Required Analysis

1. **Complete flow trace** from appointment creation to completion
2. **State machine** for all appointment statuses
3. **Database analysis** of `appointment` table and related tables
4. **Validation pipeline** for appointment creation/update
5. **Authorization matrix** for who can do what with appointments
6. **UI journey** through all appointment screens
7. **Decision points** (doctor confirmation, rescheduling, cancellation)
8. **Event candidates** for outbox pattern
9. **Hidden business rules** (status transitions, availability checks)
10. **Failure paths** (double-booking, doctor unavailable, patient no-show)

---

## Next Steps

1. Assign architect to conduct full audit
2. Use `patient-intake.md` as template
3. Produce all 15 deliverables
4. Review with clinical and frontdesk stakeholders
