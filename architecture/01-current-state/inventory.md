# Inventory & Procurement — Current State (As-Is) Reverse-Engineering Audit

**Status:** NOT STARTED
**Audit Date:** 2026-07-09
**Module:** Inventory & Procurement
**Scope:** Complete reverse-engineering of the Inventory and Procurement workflow

---

## Executive Summary

> **Note:** This document has not been produced yet. It should be created by applying the same audit process used for Patient Intake to the Inventory & Procurement module.

**Template:** Follow the structure in `architecture/01-current-state/patient-intake.md`

---

## Preliminary Observations (From Codebase Exploration)

Based on file structure and Prisma schema:

- Inventory items stored in `inventory_item` table
- Inventory categories: IMPLANT, SUTURE, ANESTHETIC, MEDICATION, DISPOSABLE, INSTRUMENT, DRESSING, OTHER, SPECIMEN_CONTAINER
- Inventory batches stored in `inventory_batch` table (expiry tracking)
- Inventory transactions stored in `inventory_transaction` table
- Stock adjustments stored in `stock_adjustment` table
- Goods receipts stored in `goods_receipt` table
- Purchase orders stored in `purchase_order` table
- PO statuses: DRAFT, SUBMITTED, APPROVED, PARTIALLY_RECEIVED, CLOSED, CANCELLED
- Purchase order items stored in `purchase_order_item` table
- Inventory usage stored in `inventory_usage` table
- Vendors stored in `vendor` table

---

## Required Analysis

1. **Complete flow trace** from PO creation to goods receipt
2. **State machine** for PO and goods receipt statuses
3. **Database analysis** of all inventory tables
4. **Validation pipeline** for inventory operations
5. **Authorization matrix** for procurement operations
6. **UI journey** through inventory screens
7. **Decision points** (approval, reorder, adjustment)
8. **Event candidates** for outbox pattern
9. **Hidden business rules** (reorder points, batch expiry)
10. **Failure paths** (stockout, over-ordering, expired stock)

---

## Next Steps

1. Assign architect to conduct full audit
2. Use `patient-intake.md` as template
3. Produce all 15 deliverables
4. Review with stores and procurement stakeholders
