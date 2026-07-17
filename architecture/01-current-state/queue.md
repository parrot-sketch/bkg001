# Queue Management — Current State (As-Is) Reverse-Engineering Audit

**Status:** NOT STARTED
**Audit Date:** 2026-07-09
**Module:** Queue Management
**Scope:** Complete reverse-engineering of the Queue Management workflow

---

## Executive Summary

> **Note:** This document has not been produced yet. It should be created by applying the same audit process used for Patient Intake to the Queue Management module.

**Template:** Follow the structure in `architecture/01-current-state/patient-intake.md`

---

## Preliminary Observations (From Codebase Exploration)

Based on file structure and Prisma schema:

- Queue entries stored in `patient_queue` table
- Queue statuses: WAITING, IN_CONSULTATION, COMPLETED, REMOVED
- Queue links Patient, Doctor, and optionally Appointment
- Queue has `position` field for ordering
- Queue tracks `added_at`, `called_at`, `completed_at`, `removed_at`
- Frontdesk adds patients to queue
- Doctors see their queue
- Queue entries can be removed with reason

---

## Required Analysis

1. **Complete flow trace** from patient check-in to queue completion
2. **State machine** for all queue statuses
3. **Database analysis** of `patient_queue` table
4. **Validation pipeline** for queue operations
5. **Authorization matrix** for queue operations
6. **UI journey** through queue screens
7. **Decision points** (when to call next, priority rules)
8. **Event candidates** for outbox pattern
9. **Hidden business rules** (position calculation, doctor assignment)
10. **Failure paths** (queue overflow, doctor unavailable)

---

## Next Steps

1. Assign architect to conduct full audit
2. Use `patient-intake.md` as template
3. Produce all 15 deliverables
4. Review with frontdesk and clinical stakeholders
