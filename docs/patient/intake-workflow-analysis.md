# Patient Intake Workflow Analysis

## Excel Sheet Columns vs Current Patient Model

### Excel Columns (Client Requirements):
```
FILE NO | CLIENT NAME | AGE | D.O.B | EMAIL | TEL | TEL WHATSAPP | 
OCCUPATION | DRUG ALLERGIES | RESIDENCE | NEXT OF KIN | RELATIONSHIP | 
TEL (next of kin) | DR.INCHARGE | SERVICE OFFERED
```

### Current Patient Schema Coverage:

| Excel Column | Patient Field | Status |
|--------------|---------------|--------|
| FILE NO | `id` | ✅ Exists (UUID) |
| CLIENT NAME | `first_name` + `last_name` | ✅ Covered |
| AGE | Calculated from `date_of_birth` | ✅ Derived |
| D.O.B | `date_of_birth` | ✅ Exists |
| EMAIL | `email` | ✅ Exists |
| TEL | `phone` | ✅ Exists |
| TEL WHATSAPP | ❌ **MISSING** | ❌ Need to add |
| OCCUPATION | ❌ **MISSING** | ❌ Need to add |
| DRUG ALLERGIES | `allergies` | ✅ Exists (text) |
| RESIDENCE | `address` | ✅ Exists |
| NEXT OF KIN | `emergency_contact_name` | ✅ Exists |
| RELATIONSHIP | `relation` | ✅ Exists |
| TEL (next of kin) | `emergency_contact_number` | ✅ Exists |
| DR.INCHARGE | `assigned_to_user_id` | ⚠️ Exists but for staff, not necessarily doctor |
| SERVICE OFFERED | N/A | ✅ Appointment-level (not patient-level) |

## Gaps Identified

### Missing Fields:
1. **`whatsapp_phone`** (String, optional) - Separate WhatsApp contact number
2. **`occupation`** (String, optional) - Patient's occupation

### Schema Considerations:
- `FILE NO` can be auto-generated or use existing `id` (UUID format)
- `DR.INCHARGE` could link to `Doctor` model directly (not just `assigned_to_user_id`)
- `SERVICE OFFERED` is appointment/service level, not patient level (correct)

## Recommended Workflow

### Patient Intake Should Begin When:
**User books consultation** → This is when they become a Patient.

**Workflow:**
1. User signs up → User (not Patient yet) → `/portal/welcome`
2. User books consultation → Patient intake flow starts → Creates Patient record
3. Patient intake can be progressive (not all at once)
4. After intake → Full Patient Dashboard becomes available

### Why Start at Consultation Booking?
- User has shown intent to engage with clinical services
- Natural trigger point (not premature)
- Allows progressive data collection
- Better UX (not overwhelming at signup)

### Progressive Intake Strategy:

**Step 1: Basic Identity** (Minimum to book consultation)
- First name, last name
- Email, phone
- Date of birth, gender

**Step 2: Contact & Emergency** (Before first visit)
- WhatsApp phone (optional)
- Address
- Emergency contact name, number, relationship

**Step 3: Medical Basics** (At consultation or before)
- Occupation
- Drug allergies
- Medical conditions (if any)
- Blood group (optional)

**Step 4: Consent & Insurance** (Required before treatment)
- Privacy consent
- Service consent
- Medical consent
- Insurance provider (optional)
- Insurance number (optional)

## Implementation Plan

1. **Add missing fields to Prisma schema** (whatsapp_phone, occupation)
2. **Create migration** for new fields
3. **Update domain entities** (Patient entity, DTOs, mappers)
4. **Design progressive intake flow** at `/portal/consultation/start`
5. **Implement step-by-step form** with validation
6. **Wire to CreatePatientUseCase** when minimum required data collected
