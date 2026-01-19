# Patient Schema Confirmation

## ✅ Confirmed Data Structure

### Patient Model - Complete Mapping

The Patient model now covers **ALL** Excel columns from client's data structure:

| Excel Column | Database Field | Type | Required | Notes |
|--------------|---------------|------|----------|-------|
| FILE NO | `file_number` | String | ✅ Auto | System-generated: NS001, NS002, etc. |
| (Internal ID) | `id` | UUID | ✅ Auto | Internal UUID (not shown to users) |
| CLIENT NAME | `first_name` + `last_name` | String | ✅ Yes | Split for better data integrity |
| AGE | *Derived* | Calculated | N/A | Calculated from `date_of_birth` |
| D.O.B | `date_of_birth` | DateTime | ✅ Yes | Full date |
| EMAIL | `email` | String | ✅ Yes | Unique constraint |
| TEL | `phone` | String | ✅ Yes | Primary phone |
| **TEL WHATSAPP** | `whatsapp_phone` | String? | ❌ Optional | ✅ **ADDED** |
| **OCCUPATION** | `occupation` | String? | ❌ Optional | ✅ **ADDED** |
| DRUG ALLERGIES | `allergies` | String? | ❌ Optional | Free text (can enhance later) |
| RESIDENCE | `address` | String | ✅ Yes | Full address |
| NEXT OF KIN | `emergency_contact_name` | String | ✅ Yes | Emergency contact |
| RELATIONSHIP | `relation` | String | ✅ Yes | Relationship to patient |
| TEL (next of kin) | `emergency_contact_number` | String | ✅ Yes | Emergency contact phone |
| DR.INCHARGE | `assigned_to_user_id` | String? | ❌ Optional | Assigned staff/doctor |
| SERVICE OFFERED | N/A | Appointment-level | N/A | Stored in Appointment/Service, not Patient |

### Additional Fields (Beyond Excel)

These fields exist for better healthcare management:

- `user_id` - Links to User account (for authenticated patients)
- `marital_status` - Additional demographic data
- `blood_group` - Medical information
- `medical_conditions` - Current conditions
- `medical_history` - Past medical history
- `insurance_provider` - Insurance info
- `insurance_number` - Insurance policy number
- `privacy_consent` - GDPR/privacy compliance
- `service_consent` - Service agreement
- `medical_consent` - Medical treatment consent
- `approved` - Administrative approval status
- `approved_by`, `approved_at` - Audit trail

## ✅ Schema is Complete

**Status:** Patient schema now fully captures client's Excel structure + additional healthcare fields.

## Recommended Workflow

**Intake Begins:** When user books consultation (`/portal/consultation/start`)

**Reasoning:**
- ✅ User has shown intent to engage clinically
- ✅ Natural User → Patient transition point
- ✅ Allows progressive data collection
- ✅ Better UX (not overwhelming at signup)
- ✅ Medical context makes questions relevant

## Next Steps

1. ✅ Schema updated with `file_number`, `whatsapp_phone`, and `occupation`
2. ✅ Domain entities, DTOs, mappers updated
3. ✅ File number generation service implemented
4. ✅ CreatePatientUseCase integrated with file number generation
5. 🔄 **Create migration** - Run `npx prisma migrate dev --name add_patient_file_number_and_fields`
6. 🔄 Design multi-step consultation booking flow
7. 🔄 Implement progressive intake at consultation booking
