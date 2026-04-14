# Billing System Audit

**Date:** 2026-04-14  
**Database:** Aiven Postgres (Production)

---

## Billing Tables Architecture

### 1. Payment (Main Billing Header)
| Column | Type | Description |
|--------|------|------------|
| id | integer | Primary key |
| patient_id | text | FK → Patient.id |
| appointment_id | integer | FK → Appointment (nullable, unique) |
| surgical_case_id | text | FK → SurgicalCase (nullable, unique) |
| bill_type | enum | CONSULTATION, SURGERY |
| status | enum | UNPAID, PARTIAL, PAID |
| total_amount | double | Running total |
| amount_paid | double | Amount received |
| payment_method | enum | CASH, MPESA, INSURANCE, BANK |
| receipt_number | text | Unique receipt |
| charge_sheet_no | text | Unique charge sheet ref |
| created_at | timestamp | |

**Relationships:**
- One Payment → Many PatientBill (line items)
- One Patient → Many Payment
- One SurgicalCase → One Payment (unique)

### 2. PatientBill (Billing Line Items)
| Column | Type | Description |
|--------|------|------------|
| id | integer | Primary key |
| payment_id | integer | FK → Payment.id |
| service_id | integer | FK → Service (nullable) |
| inventory_item_id | integer | FK → InventoryItem (nullable) |
| surgical_medication_record_id | text | FK → SurgicalMedicationRecord |
| quantity | integer | |
| unit_cost | double | |
| total_cost | double | quantity × unit_cost |

**Note:** Either service_id or inventory_item_id is set, not both.

### 3. SurgicalBillingEstimate / SurgicalBillingLineItem
| Table | Status | Description |
|-------|--------|------------|
| SurgicalBillingEstimate | 0 records | Planned surgery billing (NEW) |
| SurgicalBillingLineItem | 0 records | Line items for estimate |

**Status:** These tables are currently empty - not in use yet.

---

## Current Production Data (as of audit)

### Payment Records: 7 total

| ID | Patient | File # | Bill Type | Status | Total | Paid | Date |
|----|--------|-------|----------|--------|-------|------|------|
| 9 | FAIZE OKOTA | NS890 | SURGERY | UNPAID | 850 | 0 | 2026-04-14 |
| 8 | JOEL MUNENE BAKAJIKA | NS155 | SURGERY | PAID | 4,990 | 4,990 | 2026-04-14 |
| 7 | Bob Ochieng | TEST006 | SURGERY | UNPAID | 490 | 0 | 2026-04-14 |
| 6 | FAIZE OKOTA | NS890 | CONSULTATION | UNPAID | 5,000 | 0 | 2026-04-13 |
| 3 | PERPETUA WANJIKU | NS505 | SURGERY | UNPAID | 629 | 0 | 2026-04-11 |
| 2 | HAPPY PETER M | NS253 | SURGERY | UNPAID | 222 | 0 | 2026-04-11 |
| 1 | ABDIRAHMAN AHMED | NS221 | SURGERY | UNPAID | 1,665 | 0 | 2026-04-11 |

### PatientBill Records: 28 total

---

## Flow: How Billing Works

### Scenario 1: Consultation Billing
1. Patient books appointment → Frontdesk creates Payment with bill_type=CONSULTATION
2. Doctor provides service → PatientBill line item added
3. Patient pays → Payment status updated to PAID

### Scenario 2: Surgery/Charge Sheet Billing
1. Theater Tech creates charge sheet → SurgicalBillingLineItem (NEW SYSTEM - not yet used)
2. OR Theater Tech creates Charge Sheet → Payment with bill_type=SURGERY
3. PatientBill line items added from inventory/services
4. Frontdesk collects payment → Payment updated

---

## Issues Identified

### Issue 1: Duplicate Patient Records Showing
**Root Cause:** Each time a new charge sheet is created, a NEW Payment record is created.
- Patient FAIZE OKOTA has 2 Payment records (IDs 6 and 9)
- TEST006 patient has stale data

### Issue 2: SurgicalBillingEstimate Tables Empty
**Status:** NEW billing system (SurgicalBillingEstimate) is not in use yet.
- Currently using Payment + PatientBill (legacy)
- New system should link to SurgicalCase

### Issue 3: TEST Patients in Billing
- TEST006 (Bob Ochieng) - test data from development

---

## Recommendations

### Immediate (Requested by Client)
- Clear all TEST billing data
- Clear duplicate/unpaid test bills

### Medium Term
1. Implement SurgicalBillingEstimate for surgery cases (properly linked to SurgicalCase)
2. Prevent duplicate Payment creation for same surgical case
3. Add unique constraint: one Payment per SurgicalCase

### Future
1. Migrate from Payment-based to SurgicalBillingEstimate-based billing
2. Add payment tracking (how much paid, outstanding balance)