# Patient Intake Workflow Design

## Executive Summary

**Where Intake Begins:** When user books a consultation (`/portal/consultation/start`)

**Why Here:**
- User has shown intent to engage with clinical services
- Natural transition point: User → Patient
- Allows progressive data collection (not overwhelming)
- Better UX: don't ask for medical data until needed

## Patient Data Structure Analysis

### Excel Columns → Database Fields Mapping

| Excel Column | Current Field | Type | Status |
|--------------|---------------|------|--------|
| FILE NO | `id` | UUID (auto-gen) | ✅ OK |
| CLIENT NAME | `first_name` + `last_name` | String | ✅ OK |
| AGE | Derived from `date_of_birth` | Calculated | ✅ OK |
| D.O.B | `date_of_birth` | DateTime | ✅ OK |
| EMAIL | `email` | String (unique) | ✅ OK |
| TEL | `phone` | String | ✅ OK |
| **TEL WHATSAPP** | ❌ None | String (optional) | ❌ **ADD** |
| **OCCUPATION** | ❌ None | String (optional) | ❌ **ADD** |
| DRUG ALLERGIES | `allergies` | String (optional) | ✅ OK |
| RESIDENCE | `address` | String | ✅ OK |
| NEXT OF KIN | `emergency_contact_name` | String | ✅ OK |
| RELATIONSHIP | `relation` | String | ✅ OK |
| TEL (next of kin) | `emergency_contact_number` | String | ✅ OK |
| DR.INCHARGE | `assigned_to_user_id` | String (optional) | ⚠️ OK but generic |
| SERVICE OFFERED | N/A | Appointment-level | ✅ Correct |

### Missing Fields Recommendation

Add to `Patient` model:
1. `whatsapp_phone` - String? (optional) - WhatsApp contact number
2. `occupation` - String? (optional) - Patient's occupation

## Workflow Design

### Stage 1: User Signup (No Patient Record Yet)
- User creates account → `User` record created
- Role = `PATIENT`
- Redirects to `/portal/welcome`
- **No Patient record yet** - user hasn't engaged clinically

### Stage 2: Consultation Booking Trigger (Intake Begins)
- User clicks "Book Consultation" → `/portal/consultation/start`
- **This is where intake begins**
- Multi-step form collects data progressively

### Stage 3: Progressive Intake Flow

**Step 1: Basic Identity** (Required for consultation)
- First name, last name
- Email (pre-filled from User)
- Phone number
- Date of birth, gender

**Step 2: Service & Doctor Selection**
- Select service/concern (e.g., Liposuction, Rhinoplasty)
- Select preferred surgeon (optional)
- Medical intent/reason

**Step 3: Contact & Emergency** (Required before visit)
- Address
- WhatsApp phone (optional)
- Emergency contact name, number, relationship

**Step 4: Medical Basics** (Can be completed later or at consultation)
- Occupation (optional)
- Drug allergies (optional but recommended)
- Medical conditions (optional)
- Blood group (optional)

**Step 5: Appointment Scheduling**
- Preferred date & time
- Notes/reason for consultation

**Step 6: Consent** (Required before proceeding)
- Privacy consent
- Service consent  
- Medical consent

**Step 7: Confirmation**
- Review all information
- Submit → Creates `Patient` record + `Appointment` with PENDING status

### Stage 4: Patient Dashboard Access
- After Patient record created → User becomes "Patient"
- Redirects to `/patient/dashboard`
- Can access: Appointments, Consultations, Medical Records, etc.

## Implementation Architecture

### Database Changes Needed

```prisma
model Patient {
  // ... existing fields ...
  
  // ADD THESE:
  whatsapp_phone      String?  // WhatsApp contact number
  occupation          String?  // Patient's occupation
  
  // ... rest of fields ...
}
```

### New Domain Models Needed

**None** - We can use existing:
- `Patient` entity (with new fields)
- `Appointment` model (for consultation requests)
- `CreatePatientDto` (extended with new fields)

### API Endpoints Needed

1. `POST /api/portal/consultation/request` - Submit consultation booking
   - Creates Patient record if doesn't exist
   - Creates Appointment with PENDING status
   - Returns confirmation

### UI Components Needed

1. **Multi-step consultation form** (`/portal/consultation/start`)
   - Step-by-step progression
   - Can't skip steps via URL
   - Progress indicator
   - Save draft capability (optional)

## Benefits of This Approach

✅ **Clear Lifecycle:** User → (book consultation) → Patient  
✅ **Progressive Collection:** Don't overwhelm with all fields at once  
✅ **Mobile-Friendly:** Step-by-step is easier on mobile  
✅ **Intent-Driven:** Only collect medical data when user intends to engage  
✅ **Better UX:** Less friction, natural flow  
✅ **Compliance:** Consents collected at right time  

## Next Steps

1. Add `whatsapp_phone` and `occupation` to Patient schema
2. Create migration
3. Update Patient entity, DTOs, mappers
4. Design multi-step consultation form UI
5. Implement progressive intake workflow
6. Wire to CreatePatientUseCase when minimum data collected
