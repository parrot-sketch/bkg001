# Consent Signing Solution for Non-User Patients

**Date:** January 2025  
**Status:** Design Document  
**Challenge:** Patients are not users in the system, but need to sign consents

## Problem Statement

- **Constraint**: Patients are NOT users (no accounts, no authentication)
- **Requirement**: Patients must sign consent forms
- **Additional**: Some consents require witness signatures
- **Current Issue**: Upload/signing endpoints require authentication

## Solution: QR Code-Based Public Signing Flow

### Architecture Overview

```
Doctor creates consent → System generates unique QR code → 
Patient scans QR code → Public signing page (no auth) → 
Patient signs → System records signature → 
Doctor sees signed consent in system
```

### Key Components

#### 1. Consent Signing Session (New Model)

```prisma
model ConsentSigningSession {
  id              String        @id @default(uuid())
  consent_form_id String        @unique
  qr_code         String        @unique  // Short, unique code
  token           String        @unique  // Secure token for API access
  expires_at      DateTime      // 24-48 hour expiry
  patient_name    String?       // For display/verification
  signed_at       DateTime?
  signed_by_ip    String?
  patient_signature String?     // Base64 canvas image
  witness_name    String?
  witness_signature String?
  status          SigningStatus @default(PENDING)
  created_at      DateTime      @default(now())
  updated_at      DateTime      @updatedAt
  
  consent_form    ConsentForm   @relation(fields: [consent_form_id], references: [id], onDelete: Cascade)
  
  @@index([qr_code])
  @@index([token])
  @@index([expires_at])
  @@index([status])
}

enum SigningStatus {
  PENDING      // QR code generated, waiting for patient
  IN_PROGRESS  // Patient has opened the signing page
  SIGNED       // Patient has signed
  EXPIRED      // QR code expired without signature
  CANCELLED    // Doctor cancelled the signing session
}
```

#### 2. Public Signing Page (No Authentication)

**Route**: `/consent/sign/[qrCode]`

**Features**:
- No authentication required
- Displays consent content (PDF or HTML)
- Canvas signature pad
- Patient name confirmation
- Witness option (if required)
- Mobile-friendly design
- Time-limited access (expires after 48 hours)

**Security**:
- QR code is unique and time-limited
- Token-based API access (not user-based)
- IP address logging
- Rate limiting per QR code
- One-time use (can't sign twice)

#### 3. QR Code Generation

**When**: Consent form created with status `PENDING_SIGNATURE`

**Format**: Short, unique code (e.g., `CONS-ABC123`)
- Easy to scan
- Not guessable
- Time-limited (24-48 hours)

**Storage**: 
- QR code stored in `ConsentSigningSession`
- Links to consent form
- Expires automatically

#### 4. Workflow

**Step 1: Doctor Creates Consent**
```
Doctor → Creates consent form → Status: PENDING_SIGNATURE
System → Generates QR code → Creates ConsentSigningSession
System → Returns QR code to doctor
```

**Step 2: Doctor Shares QR Code**
```
Option A: Print QR code → Patient scans
Option B: Email/SMS QR code image → Patient scans
Option C: Display on tablet → Patient scans
```

**Step 3: Patient Signs (No Account Needed)**
```
Patient scans QR code → 
Opens /consent/sign/[qrCode] (public, no auth) →
Views consent content →
Signs with finger/stylus on canvas →
Confirms name →
Submits signature →
System records signature with IP, timestamp →
Updates consent status to SIGNED →
Doctor sees signed consent in system
```

**Step 4: Witness (If Required)**
```
If consent requires witness:
- Doctor or staff member can add witness signature
- Can be done on same page or separately
- Witness signs with their account (staff/doctor)
```

## Technical Implementation

### Public API Routes (No Authentication)

#### 1. Get Consent by QR Code
```
GET /api/public/consent/sign/[qrCode]
- No authentication required
- Validates QR code exists and not expired
- Returns consent content (PDF URL or HTML)
- Returns session status
```

#### 2. Submit Signature
```
POST /api/public/consent/sign/[qrCode]
- No authentication required
- Validates QR code and token
- Accepts: { patientSignature, patientName, witnessName? }
- Updates ConsentSigningSession
- Updates ConsentForm status to SIGNED
- Returns success/error
```

### Protected Routes (Doctor Only)

#### 1. Generate QR Code
```
POST /api/doctor/consents/[consentId]/generate-qr
- Doctor authenticated
- Creates ConsentSigningSession
- Generates QR code
- Returns QR code image/data URL
```

#### 2. Get Signing Status
```
GET /api/doctor/consents/[consentId]/signing-status
- Doctor authenticated
- Returns session status, QR code, expiry
```

#### 3. Cancel Signing Session
```
DELETE /api/doctor/consents/[consentId]/signing-session
- Doctor authenticated
- Cancels session (marks as CANCELLED)
- Generates new QR code if needed
```

## Alternative: Doctor Upload Signed PDFs

### Simpler Approach (If QR Code Too Complex)

**Workflow**:
1. Doctor creates consent form
2. Doctor prints/generates PDF
3. Patient signs physically (on paper)
4. Doctor uploads signed PDF
5. Doctor marks consent as "signed" in system
6. System stores signed PDF

**Pros**:
- ✅ Simple implementation
- ✅ No patient-facing UI needed
- ✅ Works with existing physical workflow
- ✅ No QR code complexity

**Cons**:
- ❌ Less digital workflow
- ❌ Manual upload step
- ❌ No real-time status
- ❌ Less audit trail

## Recommended Solution: Hybrid Approach

### Primary: QR Code Flow (Digital-First)
- Generate QR code for each consent
- Patient signs digitally via public page
- Real-time status updates
- Full digital audit trail

### Fallback: PDF Upload (Physical Signing)
- If patient can't use QR code
- Doctor uploads signed PDF
- Doctor marks as signed
- System stores both digital signature (if available) and PDF

## Security Considerations

### QR Code Security
- **Uniqueness**: UUID-based, not sequential
- **Expiry**: 24-48 hour time limit
- **One-time use**: Can't be reused after signing
- **Rate limiting**: Prevent brute force
- **IP logging**: Track where signature came from

### Public Route Security
- **No authentication**: But token-based access
- **CORS**: Restricted to known domains
- **Rate limiting**: Per QR code, per IP
- **Content Security**: Only show consent content, no other data

### Data Privacy
- **No patient account**: No PII stored in user table
- **Session-based**: Temporary, expires
- **Minimal data**: Only what's needed for signing
- **Audit trail**: IP, timestamp, but no persistent patient record

## Implementation Phases

### Phase 1: QR Code Generation (Doctor Side)
- Add ConsentSigningSession model
- Generate QR code endpoint
- Display QR code in ConsentsTab
- Download/print QR code option

### Phase 2: Public Signing Page (Patient Side)
- Create `/consent/sign/[qrCode]` route
- Public API endpoints (no auth)
- Canvas signature pad
- Mobile-responsive design

### Phase 3: Signature Submission
- Submit signature endpoint
- Update consent status
- Store signature image
- Notify doctor

### Phase 4: Fallback (PDF Upload)
- Upload signed PDF option
- Mark as signed manually
- Store signed PDF

## User Experience

### Doctor Workflow
1. Create consent form
2. Click "Generate QR Code"
3. QR code appears in dialog
4. Print/email/share QR code with patient
5. See real-time status: "Pending" → "Signed"
6. View signed consent with signature

### Patient Workflow
1. Receive QR code (print/email/SMS)
2. Scan with phone camera
3. Opens signing page (no login needed)
4. Reads consent content
5. Signs with finger/stylus
6. Confirms name
7. Submits
8. Sees confirmation: "Consent signed successfully"

## Technical Stack

### QR Code Generation
- **Library**: `qrcode` (already in package.json ✅)
- **Format**: PNG or SVG
- **Size**: 200x200px (good for scanning)

### Signature Capture
- **Technology**: HTML5 Canvas API (native, no dependencies)
- **Format**: Base64 PNG image
- **Size**: ~50KB per signature

### Public Routes
- **Next.js**: Public route group `(public)`
- **No middleware**: Bypass authentication
- **Token validation**: Custom token check

## Migration Path

1. **Add ConsentSigningSession model** (new table)
2. **Create public route group** `app/(public)/consent/sign/[qrCode]`
3. **Add QR code generation** to existing consent creation
4. **Add public API routes** (no auth middleware)
5. **Update ConsentsTab** to show QR code and status
6. **Add signature pad component** (canvas-based)

## Questions to Resolve

1. **QR Code Expiry**: 24 hours or 48 hours?
2. **Witness Flow**: Same QR code or separate?
3. **Multiple Signatures**: Can patient sign multiple consents with one QR?
4. **Offline Support**: What if patient has no internet?
5. **PDF Upload**: Should this be primary or fallback?

## Recommendation

**Start with QR Code Flow** because:
- ✅ Maintains digital workflow
- ✅ Better audit trail
- ✅ Real-time status
- ✅ Patient-friendly (just scan and sign)
- ✅ No patient accounts needed
- ✅ Secure (time-limited, unique codes)

**Add PDF Upload as Fallback** for:
- Patients without smartphones
- Offline scenarios
- Physical signing preference
- Emergency situations
