# Consultation — Current State (As-Is) Reverse-Engineering Audit

**Status:** NOT STARTED
**Audit Date:** 2026-07-09
**Module:** Consultation Management
**Scope:** Complete reverse-engineering of the Consultation workflow

---

## Executive Summary

> **Note:** This document has not been produced yet. It should be created by applying the same audit process used for Patient Intake to the Consultation module.

**Template:** Follow the structure in `architecture/01-current-state/patient-intake.md`

---

## Preliminary Observations (From Codebase Exploration)

Based on file structure and Prisma schema:

- Consultations stored in `consultation` table
- Consultation linked to Appointment (unique), Doctor, and optionally User
- Consultation tracks `started_at`, `completed_at`, `duration_minutes`
- Consultation has `outcome`, `outcome_type`, `patient_decision`
- Consultation has `follow_up_date`, `follow_up_type`, `follow_up_notes`
- Consultation has `chief_complaint`, `examination`, `plan`, `assessment`
- Doctor consultations stored in `doctor_consultation` table (peer-to-peer)
- Consultation messages stored in `consultation_message` table
- Consultation attachments stored in `consultation_attachment` table

---

## Required Analysis

1. **Complete flow trace** from consultation start to completion
2. **State machine** for consultation lifecycle
3. **Database analysis** of `consultation` and related tables
4. **Validation pipeline** for consultation data
5. **Authorization matrix** for consultation operations
6. **UI journey** through consultation screens
7. **Decision points** (outcome recording, follow-up scheduling)
8. **Event candidates** for outbox pattern
9. **Hidden business rules** (duration tracking, follow-up rules)
10. **Failure paths** (consultation interrupted, incomplete notes)

---

## Next Steps

1. Assign architect to conduct full audit
2. Use `patient-intake.md` as template
3. Produce all 15 deliverables
4. Review with doctors and clinical staff
