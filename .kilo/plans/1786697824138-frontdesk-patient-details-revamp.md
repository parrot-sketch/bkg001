# Frontdesk Patient Details Page — Revamp Plan

## Objective
Redesign `/frontdesk/patient/[patientId]` into a clean, professional, brand-consistent page backed by robust functionality. Use `app/doctor/appointments/[id]/page.tsx` as the UI reference for card density, spacing, typography, and action layout.

## Current State Audit
| Area | Finding |
|------|---------|
| **Data fetch** | `utils/services/patient.ts:333` `getPatientFullDataById` uses an explicit `select` that omits `referral_source`, `occupation`, and other fields. Frontdesk page relies on this legacy service. |
| **Edit capability** | Frontdesk **already has** edit via `components/frontdesk/PatientDetailActions.tsx` → `PatientEditDialog`. No new write flow needed unless requested. |
| **Emergency contact UI** | `PatientOverviewPanel.tsx` hides emergency contact behind a blur/reveal overlay. User wants all contact info visible to frontdesk. |
| **Minor registration** | Occupation, email, and marital status are currently conditionally hidden or required for minors. Client complaint confirms adults sometimes see them missing. |
| **Brand consistency** | Existing palette: `#2c2e4b` (navy), `#caa26a` (gold), `#e7d6bf` (beige). Doctor appointment page already uses this consistently. |

## Decisions Made
1. **Data layer**: Add missing patient fields to `getPatientFullDataById` select and to the `patientDetail` DTO in the page.
2. **Minor validation**: Email, marital status, and occupation are optional for all patients; do not gate them behind `isMinor`.
3. **Emergency contact**: Always visible — remove blur/reveal overlay from frontdesk overview.
4. **UI redesign**: Rebuild the frontdesk patient page using a card-grid layout modeled on the doctor appointment detail page: hero header → patient info card → sections grid → sidebar actions.

## Implementation Tasks
1. **Update legacy patient query**
   - In `utils/services/patient.ts`, extend the `select` in `getPatientFullDataById` to include `occupation`, `referral_source`, `whatsapp_phone`, `insurance_provider`, `insurance_number`, and any other fields needed by the overview panel.
   - Verify the returned object shape is consumed correctly by the page.

2. **Update frontdesk page DTO mapping**
   - In `app/frontdesk/patient/[patientId]/page.tsx`, add `referralSource`, `occupation`, `insuranceProvider`, `insuranceNumber`, and `whatsappPhone` to the `patientDetail` object passed to `PatientDetailActions`.

3. **Fix minor registration validation**
   - `lib/schema.ts`: Ensure `email`, `marital_status`, and `occupation` are `.optional()` (already applied in prior turn; verify no `.refine` blocks them for minors).
   - `components/frontdesk/PatientRegistrationDialog.tsx`: Remove `{!patientIsMinor && ...}` wrappers around occupation and marital status so they are always rendered and always optional.
   - `components/frontdesk/usePatientRegistrationDialog.ts`: Step 2 validation must not require `email` for minors; keep `phone` required, `email` optional.

4. **Revamp frontdesk patient details UI**
   - Replace the current tab-heavy layout with a focused single-page card layout:
     - **Header**: patient name, file number, age, gender, status badge, and primary actions (Edit, Back).
     - **Patient Info Card**: avatar/initials, phone, email, WhatsApp, address, gender, DOB, blood group, occupation, referral source.
     - **Emergency Contact Card**: name, phone, relationship — always visible, no blur.
     - **Medical Overview Card**: allergies, medical conditions, medical history, insurance provider/number.
     - **Quick Stats Row**: appointments count, last visit, registered date.
     - **Right Sidebar**: keep existing quick actions (Add to Queue, Schedule Appointment, view Appointments/Billing).
   - Use existing brand colors and the `DetailRow` pattern from `components/doctor/appointments/DetailRow.tsx`.
   - Keep the existing `PatientEditDialog` as the write path; no new edit UI required.

5. **Clean up blurred emergency contact**
   - In `components/patient/PatientOverviewPanel.tsx`, remove the `isRevealed` blur state and always render emergency contact fields plainly.
   - Ensure `PatientOverviewPanel` props include all fields required for the new layout.

6. **Validation**
   - Run `npx tsc --noEmit` and confirm zero errors in modified files.
   - Run `npx vitest run tests/unit/surgical-workflow/plan-page1-service.test.ts` as a smoke test.
   - Manually verify frontdesk patient page loads with all fields and edit dialog pre-fills new fields.

## Out of Scope
- Changing `Appointment.source` semantics.
- New frontdesk write flows beyond the existing `PatientEditDialog`.
- Doctor/nurse pages.

## Rollback
- All UI changes are additive; revert to prior git commit if layout breaks.
- Database schema change is additive (`referral_source` nullable), safe to keep.
