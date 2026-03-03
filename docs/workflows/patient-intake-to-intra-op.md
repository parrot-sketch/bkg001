# Patient Intake to Intra-Op Workflow

**Last Updated:** February 2025

## Overview

This document describes the complete patient workflow from walk-in intake through surgical case intra-operative documentation, including data flow, security considerations, and integration points.

## Current Workflow

### 1. Patient Walk-In / Intake

**Path A: New Walk-In Patient (QR Code)**
1. Frontdesk staff initiates intake session → `/frontdesk/intake/start`
2. System generates:
   - Unique `sessionId` (cuid)
   - QR code (contains `sessionId`)
   - Intake form URL: `/patient/intake?sessionId={sessionId}`
   - Expiration: 60 minutes
3. Patient scans QR code with phone
4. Patient fills intake form privately:
   - Personal information
   - Contact details
   - Medical information (allergies, conditions, history)
   - Insurance information
   - Consents (privacy, service, medical)
5. Form submission creates `IntakeSubmission` record
6. Frontdesk reviews submission → `/frontdesk/intake/review/{sessionId}`
7. Frontdesk confirms → Creates `Patient` record from submission

**Path B: Existing Patient (Frontdesk Registration)**
1. Frontdesk searches for patient → `/frontdesk/patient-intake`
2. If found: Use existing patient
3. If not found: Create new patient via `PatientRegistrationDialog`
4. Patient data stored in `Patient` table

**Security Concerns:**
- ❌ QR code URL is publicly accessible (anyone with link can access)
- ❌ No network restriction (can be accessed from anywhere)
- ❌ Session expiration only (60 min) - no IP/geofencing
- ❌ No audit trail of who accessed the intake form

### 2. Appointment Booking

**For Walk-In Patients:**
1. After intake confirmation, frontdesk books appointment
2. Appointment created with status `PENDING` or `SCHEDULED`
3. Patient added to queue

**For Existing Patients:**
1. Frontdesk books appointment directly
2. Appointment created with status `PENDING` or `SCHEDULED`

### 3. Check-In Process

**Location:** `/frontdesk/appointments` → Check-in button

**What Check-In Entails:**
1. Patient arrives at clinic
2. Frontdesk verifies:
   - Patient identity (ID card, registration number)
   - Appointment exists and is scheduled
   - Patient is in system
3. Frontdesk clicks "Check In" → Updates appointment status to `CHECKED_IN`
4. **Missing:** No structured verification data stored
   - ID verification not recorded
   - Consent verification not recorded
   - Pre-op checklist status not recorded

**Current Implementation:**
- `CheckInPatientUseCase` only updates appointment status
- No verification data stored
- No link to intake submission

### 4. Pre-Operative Preparation

**Location:** `/nurse/ward-prep`

**Process:**
1. Nurse reviews patient
2. Nurse completes pre-op checklist
3. Patient prepared for surgery
4. Patient moved to theater

**Missing Integration:**
- Pre-op checklist completion not linked to intra-op form
- No automatic verification that pre-op was completed

### 5. Intra-Operative Documentation

**Location:** `/nurse/intra-op-cases/{caseId}/record`

**Current Safety Checks (Manual Entry):**
- Patient ID Verified with Reg No. ❌ (manual checkbox)
- Informed Consent Signed ❌ (manual checkbox)
- Pre-op Checklist Completed ❌ (manual checkbox)
- WHO Checklist Completed ❌ (manual checkbox)
- Arrived with IV infusing ❌ (manual checkbox)

**Issues:**
- All safety checks are manual
- No automatic population from:
  - Intake submission (ID verification, consents)
  - Check-in process (ID verification)
  - Pre-op checklist (completion status)
- Allergies manually entered (should come from patient record)
- Risk of data inconsistency

## Data Flow Analysis

### Current Data Entities

```
IntakeSession
  ├─ session_id (unique)
  ├─ expires_at
  └─ IntakeSubmission (1:1)
      ├─ allergies
      ├─ medical_conditions
      ├─ medical_history
      ├─ privacy_consent
      ├─ service_consent
      ├─ medical_consent
      └─ created_patient_id (after confirmation)

Patient
  ├─ id
  ├─ allergies
  ├─ medical_conditions
  ├─ medical_history
  ├─ has_privacy_consent
  ├─ has_service_consent
  ├─ has_medical_consent
  └─ file_number

Appointment
  ├─ id
  ├─ patient_id
  ├─ status (PENDING → SCHEDULED → CHECKED_IN → ...)
  └─ checked_in_at (timestamp)

SurgicalCase
  ├─ id
  ├─ patient_id
  ├─ consultation_id
  └─ status

NurseIntraOpRecord (ClinicalForm)
  ├─ entry (arrival data)
  ├─ safety (safety checks - MANUAL)
  │   ├─ patientIdVerified
  │   ├─ informedConsentSigned
  │   ├─ preOpChecklistCompleted
  │   └─ whoChecklistCompleted
  └─ ... (other sections)
```

### Missing Links

1. **IntakeSubmission → Patient**: ✅ Exists (`created_patient_id`)
2. **IntakeSubmission → Appointment**: ❌ Missing
3. **IntakeSubmission → SurgicalCase**: ❌ Missing
4. **Check-In → Verification Data**: ❌ Missing
5. **Pre-op Checklist → Intra-op Form**: ❌ Missing
6. **Patient Allergies → Intra-op Form**: ❌ Missing (manual entry)

## Proposed Improvements

### 1. Enhanced Check-In Process

**Add Verification Tracking:**
```typescript
interface CheckInVerification {
  appointmentId: string;
  patientId: string;
  verifiedById: string; // Frontdesk staff
  idVerified: boolean;
  idVerificationMethod: 'ID_CARD' | 'REGISTRATION_NUMBER' | 'OTHER';
  idVerificationNotes?: string;
  consentVerified: boolean;
  intakeSubmissionId?: string; // Link to intake if walk-in
  verifiedAt: Date;
}
```

**Store in Database:**
- New table: `CheckInVerification`
- Links: `appointment_id`, `patient_id`, `intake_submission_id`

### 2. Auto-Populate Intra-Op Safety Checks

**Data Sources:**
1. **Patient ID Verified**: From `CheckInVerification.idVerified`
2. **Informed Consent Signed**: From `Patient.has_medical_consent` OR `IntakeSubmission.medical_consent`
3. **Pre-op Checklist Completed**: From `SurgicalChecklist.status === 'COMPLETED'`
4. **Allergies**: From `Patient.allergies` (auto-populate, allow override)

**Implementation:**
- Fetch patient data when loading intra-op form
- Fetch check-in verification if exists
- Fetch pre-op checklist status
- Auto-populate safety section
- Show source of data (e.g., "Verified during check-in at 10:30 AM")
- Allow manual override with reason

### 3. Secure QR Code Intake

**Option A: Network-Based Restriction (Recommended)**
- Check client IP address against clinic network range
- Requires clinic to have static IP or known IP ranges
- No additional cost (uses existing network infrastructure)
- Implementation: Middleware checks IP on intake form access

**Option B: Geofencing**
- Use GPS coordinates (requires patient location permission)
- Define clinic boundaries
- More complex, requires location services
- May not work well indoors

**Option C: Time-Limited + IP Whitelist**
- Combine session expiration with IP whitelist
- Only allow access from clinic network
- Simple to implement
- Requires network configuration

**Recommended: Option C (Time-Limited + IP Whitelist)**

**Implementation:**
1. Add `allowed_ip_ranges` to `IntakeSession` (optional)
2. Middleware checks:
   - Session is active (not expired)
   - Client IP is in allowed range (if specified)
   - If no IP range specified, allow from anywhere (backward compatible)
3. Log all access attempts for audit

### 4. Enhanced Data Integration

**Create Service:**
```typescript
class PatientIntakeIntegrationService {
  // Get intake data for patient
  async getPatientIntakeData(patientId: string): Promise<IntakeData | null>
  
  // Get check-in verification
  async getCheckInVerification(appointmentId: string): Promise<CheckInVerification | null>
  
  // Get pre-op checklist status
  async getPreOpChecklistStatus(caseId: string): Promise<boolean>
  
  // Auto-populate intra-op safety checks
  async getAutoPopulatedSafetyChecks(caseId: string): Promise<SafetyChecks>
}
```

## Implementation Plan

### Phase 1: Data Integration
1. ✅ Create `CheckInVerification` table
2. ✅ Enhance check-in process to store verification
3. ✅ Create service to fetch intake data
4. ✅ Auto-populate intra-op form safety checks

### Phase 2: Security
1. ✅ Add IP whitelist to intake sessions
2. ✅ Implement IP-based access control
3. ✅ Add audit logging for intake access

### Phase 3: Workflow Enhancement
1. ✅ Link intake → check-in → intra-op
2. ✅ Add verification status indicators
3. ✅ Improve data consistency

## Security Considerations

### QR Code Security

**Current Risk:**
- QR code URL can be shared
- Accessible from anywhere
- No network restriction

**Solutions:**

1. **IP Whitelist (No Cost)**
   - Configure clinic network IP ranges
   - Only allow access from clinic network
   - Requires static IP or known IP ranges
   - **Implementation:** Add IP check in middleware

2. **VPN Requirement**
   - Require VPN connection to clinic network
   - More secure but requires VPN setup
   - May be overkill for intake forms

3. **Time-Limited + One-Time Use**
   - Mark session as "used" after first access
   - Still accessible from anywhere but only once
   - Less secure but simpler

4. **Hybrid Approach (Recommended)**
   - Time-limited (60 min)
   - IP whitelist (if configured)
   - One-time use flag (optional)
   - Audit logging

**Network Configuration:**
- Clinic needs to provide IP range(s)
- Format: `192.168.1.0/24` (CIDR notation)
- Can have multiple ranges
- Stored in environment variable or database

## Clinical Importance

### Why This Matters

1. **Patient Safety:**
   - Allergies must be accurate and visible
   - ID verification prevents wrong-patient procedures
   - Consent verification ensures legal compliance

2. **Efficiency:**
   - Auto-population reduces data entry errors
   - Reduces time spent on redundant verification
   - Improves workflow continuity

3. **Compliance:**
   - Audit trail of all verifications
   - Link between intake → check-in → intra-op
   - Regulatory compliance (WHO checklist, etc.)

4. **Data Integrity:**
   - Single source of truth for patient data
   - Reduces manual entry errors
   - Ensures consistency across forms

## Next Steps

1. Review and approve workflow improvements
2. Implement Phase 1 (Data Integration)
3. Implement Phase 2 (Security)
4. Test with real workflow
5. Train staff on new process
