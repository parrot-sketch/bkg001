# Billing — Current State (As-Is) Reverse-Engineering Audit

**Status:** NOT STARTED
**Audit Date:** 2026-07-09
**Module:** Billing & Payments
**Scope:** Complete reverse-engineering of the Billing workflow

---

## Executive Summary

> **Note:** This document has not been produced yet. It should be created by applying the same audit process used for Patient Intake to the Billing module.

**Template:** Follow the structure in `architecture/01-current-state/patient-intake.md`

---

## Preliminary Observations (From Codebase Exploration)

Based on file structure and Prisma schema:

- Payments stored in `payment` table
- Payment statuses: PAID, UNPAID, PART
- Payment methods: CASH, CARD, MOBILE_MONEY, BANK_TRANSFER
- Bill types: CONSULTATION, SURGERY, LAB_TEST, FOLLOW_UP, OTHER
- Payment linked to Patient, Appointment, and optionally SurgicalCase
- Payment has `bill_items` (PatientBill) for line items
- Payment has `discount`, `total_amount`, `amount_paid`
- Payment has `receipt_number` (unique)
- Payment has `finalized_at`, `finalized_by`
- Surgical billing estimates stored in `surgical_billing_estimate` table
- Billing line items stored in `surgical_billing_line_item` table

---

## Required Analysis

1. **Complete flow trace** from invoice creation to payment
2. **State machine** for payment statuses
3. **Database analysis** of `payment` and related tables
4. **Validation pipeline** for billing operations
5. **Authorization matrix** for billing operations
6. **UI journey** through billing screens
7. **Decision points** (discount approval, payment verification)
8. **Event candidates** for outbox pattern
9. **Hidden business rules** (discount limits, payment reconciliation)
10. **Failure paths** (partial payment, refund processing)

---

## Next Steps

1. Assign architect to conduct full audit
2. Use `patient-intake.md` as template
3. Produce all 15 deliverables
4. Review with finance and cashier stakeholders
