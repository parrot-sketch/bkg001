# Consent Signing Security Model: Identity Verification Without Patient Accounts

**Date:** January 2025  
**Status:** Security Design Document  
**Challenge:** Verify patient identity for consent signing without patient user accounts

## The Core Problem

**Question:** If patients don't have accounts, how do we verify WHO actually signed the consent?

**Risk:** Without identity verification, anyone with the QR code could sign, leading to:
- Legal invalidity of consent
- Fraud/impersonation
- Regulatory non-compliance
- Patient safety risks

## Solution: Multi-Factor Identity Verification

### Approach: Verify Identity, Not Authentication

Instead of requiring patient accounts, we verify identity using **information the patient knows** and **channels the patient controls**.

## Identity Verification Methods

### Method 1: Knowledge-Based Verification (Primary)

**What Patient Must Provide:**
1. **Full Name** (must match patient record exactly)
2. **Date of Birth** (must match patient record)
3. **Patient File Number** (optional, if available)

**How It Works:**
```
Patient scans QR code →
Opens signing page →
System displays: "Please verify your identity" →
Patient enters: Name + DOB →
System validates against ConsentForm's associated patient →
If match: Proceed to signing
If no match: Show error, allow retry (max 3 attempts)
```

**Security:**
- ✅ Patient must know their DOB (not public info)
- ✅ Name must match exactly (case-insensitive, but exact match)
- ✅ File number adds extra layer (if used)
- ⚠️ **Limitation**: If someone knows patient's DOB, they could sign

### Method 2: OTP via SMS/Phone (Recommended Addition)

**What Patient Must Provide:**
1. Phone number (entered or pre-filled from patient record)
2. OTP code sent to that phone

**How It Works:**
```
Patient enters phone number →
System sends OTP to phone number on file →
Patient enters OTP →
System validates OTP (time-limited, 5-10 minutes) →
If valid: Proceed to signing
If invalid: Show error, allow resend (max 3 attempts)
```

**Security:**
- ✅ Patient must have access to their phone
- ✅ OTP expires quickly (5-10 minutes)
- ✅ One-time use (can't reuse OTP)
- ✅ Rate limiting (max 3 attempts per session)
- ✅ Logs phone number used

**Implementation:**
- Use existing SMS service (if available)
- Or use Twilio/AWS SNS for SMS
- Store OTP in `ConsentSigningSession` with expiry

### Method 3: In-Person Staff Verification (For Surgical Consents)

**What Happens:**
- Staff member (doctor/nurse) must be present
- Staff member verifies patient identity (checks ID, asks questions)
- Staff member clicks "I verify this patient's identity"
- Staff member signs as witness
- Patient then signs

**How It Works:**
```
Doctor creates consent →
Generates QR code →
Staff member scans QR code (or patient scans in clinic) →
Staff member verifies patient identity →
Staff member clicks "Verify Identity" (requires staff login) →
System records: "Identity verified by [Staff Name] at [Time]" →
Patient can now sign →
Both signatures recorded
```

**Security:**
- ✅ Staff member is authenticated (has account)
- ✅ Staff member is accountable (logged)
- ✅ In-person verification (hardest to fake)
- ✅ Required for high-risk consents (surgical procedures)

### Method 4: Device/IP-Based Verification (Supporting)

**What We Log:**
- IP address
- User agent (browser/device)
- Timestamp
- Geographic location (if available)

**How It Works:**
- System logs IP address when QR code is accessed
- System logs IP address when signature is submitted
- If IPs differ significantly, flag for review
- If signing happens from known clinic IP, add trust score

**Security:**
- ⚠️ **Not primary verification** (IPs can be spoofed)
- ✅ **Audit trail** (helps investigate fraud)
- ✅ **Pattern detection** (unusual locations flagged)

## Recommended Security Model

### Tier 1: Standard Consents (Low Risk)
**Verification Required:**
1. ✅ Name + DOB match
2. ✅ OTP via SMS (if phone on file)
3. ✅ IP/device logging

**Example:** General procedure consent, photography consent

### Tier 2: Surgical Consents (High Risk)
**Verification Required:**
1. ✅ Name + DOB match
2. ✅ OTP via SMS
3. ✅ **Staff witness verification** (mandatory)
4. ✅ IP/device logging
5. ✅ In-clinic signing preferred (IP-based trust)

**Example:** Anesthesia consent, surgical procedure consent

### Tier 3: Emergency Consents (Special Case)
**Verification Required:**
1. ✅ Name + DOB match
2. ✅ Staff witness verification (mandatory, no exceptions)
3. ✅ Doctor override with justification
4. ✅ Post-signature audit review

**Example:** Emergency surgery consent

## Updated Data Model

### ConsentSigningSession (Enhanced)

```prisma
model ConsentSigningSession {
  id                    String        @id @default(uuid())
  consent_form_id       String        @unique
  qr_code               String        @unique
  token                 String        @unique
  expires_at            DateTime
  
  // Identity Verification
  verification_method   VerificationMethod
  patient_name_entered   String?       // What patient typed
  patient_dob_entered   String?       // What patient entered
  patient_file_number   String?       // If used
  phone_number_used     String?       // Phone number for OTP
  otp_sent              Boolean       @default(false)
  otp_verified          Boolean       @default(false)
  otp_code              String?       // Hashed OTP
  otp_expires_at        DateTime?
  
  // Staff Verification (for surgical consents)
  requires_staff_verify Boolean       @default(false)
  verified_by_staff_id  String?       // Staff user ID
  verified_by_staff_at  DateTime?
  staff_verification_note String?     // Optional note
  
  // Signing
  signed_at             DateTime?
  signed_by_ip          String?
  signed_by_user_agent  String?
  patient_signature     String?       // Base64 canvas image
  
  // Witness (if required)
  witness_name          String?
  witness_signature     String?
  witness_id            String?       // If staff witness
  
  status                SigningStatus  @default(PENDING)
  
  // Audit
  identity_match_score  Float?        // 0.0-1.0 (how well name/DOB matched)
  verification_attempts Int           @default(0)
  failed_attempts       Int           @default(0)
  
  created_at            DateTime       @default(now())
  updated_at            DateTime       @updatedAt
  
  consent_form          ConsentForm    @relation(fields: [consent_form_id], references: [id], onDelete: Cascade)
  verified_by_staff     User?          @relation(fields: [verified_by_staff_id], references: [id])
  witness_user           User?          @relation(fields: [witness_id], references: [id])
  
  @@index([qr_code])
  @@index([token])
  @@index([expires_at])
  @@index([status])
  @@index([requires_staff_verify])
}

enum VerificationMethod {
  NAME_DOB_ONLY        // Basic: name + DOB
  NAME_DOB_OTP         // Standard: name + DOB + OTP
  STAFF_VERIFIED       // High-risk: staff verified identity
  EMERGENCY_OVERRIDE   // Emergency: doctor override
}

enum SigningStatus {
  PENDING           // QR code generated, waiting
  VERIFYING         // Patient entered info, verifying
  VERIFIED          // Identity verified, ready to sign
  SIGNING           // Patient is signing
  SIGNED            // Successfully signed
  VERIFICATION_FAILED // Identity verification failed
  EXPIRED           // QR code expired
  CANCELLED         // Doctor cancelled
}
```

## Updated Workflow

### Standard Consent Flow (Tier 1)

```
1. Doctor creates consent → Status: PENDING_SIGNATURE
2. System generates QR code → Creates ConsentSigningSession
3. Doctor shares QR code with patient
4. Patient scans QR code → Opens /consent/sign/[qrCode]
5. System shows: "Verify Your Identity"
6. Patient enters:
   - Full Name
   - Date of Birth
7. System validates against patient record:
   - Name match (case-insensitive, exact)
   - DOB match (exact)
   - If match: Proceed
   - If no match: Show error, allow retry (max 3)
8. System sends OTP to patient's phone (if on file)
9. Patient enters OTP
10. System validates OTP (5-10 min expiry)
11. If valid: Show consent content + signature pad
12. Patient signs
13. System records:
    - Signature image
    - IP address
    - User agent
    - Timestamp
    - Verification method used
14. Status: SIGNED
15. Doctor sees signed consent
```

### Surgical Consent Flow (Tier 2)

```
1. Doctor creates consent → Status: PENDING_SIGNATURE
2. System marks: requires_staff_verify = true
3. System generates QR code
4. Doctor shares QR code (in clinic, with staff present)
5. Staff member scans QR code OR patient scans in clinic
6. Staff member logs in (authenticated)
7. Staff member verifies patient identity:
   - Checks patient ID card
   - Asks patient name, DOB
   - Confirms patient understands consent
8. Staff member clicks "I verify this patient's identity"
9. System records:
    - verified_by_staff_id
    - verified_by_staff_at
    - staff_verification_note (optional)
10. Patient enters name + DOB (validated)
11. System sends OTP (if phone on file)
12. Patient enters OTP
13. Patient signs
14. Staff member signs as witness (optional, but recommended)
15. System records both signatures
16. Status: SIGNED
```

## Security Measures

### 1. Rate Limiting
- **Verification Attempts**: Max 3 failed attempts per QR code
- **OTP Requests**: Max 3 OTP requests per session
- **IP-Based**: Max 5 signing attempts per IP per hour
- **QR Code**: One-time use (invalid after signing)

### 2. Time Limits
- **QR Code Expiry**: 24-48 hours (configurable by consent type)
- **OTP Expiry**: 5-10 minutes
- **Session Timeout**: 30 minutes of inactivity

### 3. Audit Trail
Every signing session logs:
- Who entered what (name, DOB, phone)
- When verification happened
- IP address and user agent
- Verification method used
- Staff verification (if applicable)
- Signature timestamp
- Any failed attempts

### 4. Fraud Detection
- **Unusual IP**: Flag if signing from unexpected location
- **Multiple Failures**: Flag if 3+ failed verification attempts
- **Rapid Signing**: Flag if multiple consents signed from same IP quickly
- **Mismatch Patterns**: Flag if name/DOB don't match but OTP verified

### 5. Legal Validity
- **Name Match**: Must match patient record exactly
- **DOB Match**: Must match patient record exactly
- **Timestamp**: Precise timestamp of signing
- **IP Logging**: Geographic location (if available)
- **Staff Witness**: For high-risk consents (logged and authenticated)

## Implementation Priority

### Phase 1: Basic Verification (MVP)
- Name + DOB matching
- IP/device logging
- Basic audit trail
- **Risk**: Medium (relies on patient knowing DOB)

### Phase 2: OTP Verification (Recommended)
- SMS OTP integration
- Phone number validation
- OTP expiry and rate limiting
- **Risk**: Low (requires phone access)

### Phase 3: Staff Verification (High-Risk Consents)
- Staff authentication for verification
- Witness signature support
- In-clinic signing workflow
- **Risk**: Very Low (staff accountability)

### Phase 4: Advanced Security
- Device fingerprinting
- Geographic location validation
- Fraud detection algorithms
- **Risk**: Very Low (defense in depth)

## Answer to Your Question

**"How do we defend this system if we have no way of telling who signed?"**

**Answer:** We use **multi-factor identity verification**:

1. **Knowledge Factor**: Patient must know their name + DOB (matches patient record)
2. **Possession Factor**: Patient must have access to their phone (OTP)
3. **In-Person Factor**: Staff member verifies identity for high-risk consents
4. **Audit Factor**: We log everything (IP, device, timestamp, verification method)

**This is NOT as secure as authenticated accounts**, but it's **legally defensible** because:
- ✅ We verify identity using patient-specific information
- ✅ We require possession of patient's phone (OTP)
- ✅ We have staff verification for high-risk consents
- ✅ We maintain a complete audit trail
- ✅ We can detect and flag suspicious patterns

**For maximum security**, combine all methods:
- Name + DOB + OTP + Staff Verification = Very Strong Identity Assurance

## Recommendation

**Start with Tier 2 (Surgical Consents) approach:**
1. Name + DOB matching (required)
2. OTP via SMS (required, if phone on file)
3. Staff verification (required for surgical consents)
4. Complete audit trail

This provides **strong identity verification** without requiring patient accounts, while maintaining **legal validity** and **regulatory compliance**.
