# User vs Patient Lifecycle Architecture

## Core Insight

**A user account is NOT the same thing as a patient.**

These are two different lifecycle states with distinct purposes and workflows.

## The Problem with Conflating User and Patient

Most systems fail because they assume:
```
Signup = Patient ❌
```

This leads to:
- Empty dashboards for new users
- Premature clinical workflows
- Consent confusion
- Fake patient records
- Broken conversion funnels

## Correct Mental Model

| Concept | Meaning |
|---------|---------|
| **Visitor** | Anyone browsing the public website (unauthenticated) |
| **User** | Someone who has an account (email + password) |
| **Patient** | A user who has initiated or completed clinical intake |
| **Active Patient** | A patient who has booked / undergoing care |
| **Clinical Record** | Medical identity attached to a patient lifecycle |

## Correct Lifecycle for Nairobi Sculpt

### 1. Visitor (Public Website)

**State:** Unauthenticated  
**Access:** Public website only

**Can access:**
- Landing page
- Services
- Doctors
- Before/After gallery
- Pricing
- FAQs

**Actions:**
- Browse freely
- View doctors
- Read content
- Click "Book Consultation" or "Create Account"

**No authentication needed.**

### 2. User (Authenticated, but not yet a Patient)

**State:** Authenticated with account  
**Has:** Email + password, basic profile  
**Has NOT:** PatientProfile, clinical data, medical records

**After signup:**
They become a **User**, NOT a Patient yet.

**Should NOT be dropped into clinical dashboard.**

Instead, they enter a **Client Portal** (onboarding-focused).

**Purpose:**
"What can I do as someone interested in becoming a patient?"

This is where **business onboarding** happens.

**Client Portal Features:**
- Complete profile
- Browse doctors
- Book consultation
- Ask pre-sales questions
- See pricing
- Read policies
- Upload photos for pre-consult (optional)
- Schedule virtual consultation

**No clinical modules yet.**  
**No PatientProfile exists.**  
**No medical records.**

### 3. Patient (Triggered by Intent, Not Signup)

**State:** User + PatientProfile  
**Triggered when:**
- Books consultation
- Submits intake form
- Starts medical workflow
- Has appointment created
- Clinical data is collected

**This is when:**
- A `PatientProfile` is created (linked to `User` via `user_id`)
- A `MedicalRecord` can begin
- Consents become relevant
- Doctor workflows attach
- Legal obligations begin

**At this point:**
They are now **legally and functionally a patient.**

**See:** Patient Dashboard (clinical UX)

### 4. Active Care Phase (Full Patient Dashboard)

**State:** Patient with ongoing care  
**Features:**
- Appointments
- Consultations
- Documents
- Consents
- Care plans
- Messages
- Post-op instructions
- Payments

**This is clinical UX, not marketing UX.**

## Architecture Layers

### Three Distinct Layers

```
1. Public Website
   - Landing
   - Doctors
   - Services
   - Pricing
   - Gallery
   - FAQs
   ↓
   [Signup/Login]
   ↓

2. Client Portal (User without PatientProfile)
   - Welcome / Onboarding
   - Book consultation
   - Explore doctors
   - Upload pre-consult photos (optional)
   - Complete profile
   - See consultation status
   ↓
   [Books Consultation / Intake]
   ↓

3. Patient Portal (User with PatientProfile)
   - Appointments
   - Consultations
   - Documents
   - Consents
   - Treatment plans
   - Medical communication
```

## Difference: Landing Page vs Client Portal

| Aspect | Landing Page | Client Portal |
|--------|-------------|---------------|
| **Purpose** | Marketing site | Personalized experience |
| **State** | Anonymous | Authenticated |
| **Content** | Persuasive content | Action-oriented flows |
| **Nature** | Static info | Dynamic progress |
| **CTA** | "Sign up" | "Book consultation" |
| **Focus** | SEO focused | Conversion focused |
| **Access** | Public | Private |

They serve **totally different purposes.**

## Database Model

### User Entity
```prisma
model User {
  id            String    @id
  email         String    @unique
  password_hash String
  role          Role      // Can be PATIENT role, but no PatientProfile yet
  // ...
  
  patient_profile Patient? @relation("PatientUser") // Optional!
}
```

**Key insight:** `User.patient_profile` is **optional** (nullable relation).

### Patient Entity
```prisma
model Patient {
  id                       String    @id
  user_id                  String?   @unique // Links to User if patient has account
  // ... clinical fields
  
  user User? @relation("PatientUser", fields: [user_id], references: [id])
}
```

**Key insight:** `Patient.user_id` is **optional** (nullable).  
- Patient can exist without User (created by frontdesk)
- User can exist without Patient (just signed up)

## Routing Logic

### After Login/Registration

```typescript
// Check if user has PatientProfile
const hasPatientProfile = await checkUserHasPatientProfile(userId);

if (hasPatientProfile) {
  // User is a Patient → Clinical Dashboard
  router.push('/patient/dashboard');
} else {
  // User is NOT a Patient yet → Client Portal
  router.push('/portal/welcome');
}
```

### Route Protection

**`/portal/*`** - Requires authentication, NO PatientProfile required  
**`/patient/*`** - Requires authentication + PatientProfile

## Real-World Example Flow

### Scenario: Jane's Journey

1. **Visitor (Public)**
   - Jane visits Nairobi Sculpt website
   - Browses services
   - Clicks "Book Consultation"

2. **User (Client Portal)**
   - Creates account
   - After signup → enters **Client Portal**
   - Sees:
     - "Welcome Jane"
     - "Book your first consultation"
     - "Meet our doctors"
   - Books consultation

3. **Patient (Patient Dashboard)**
   - System creates `PatientProfile`
   - Links to `User` via `user_id`
   - Now sees **Patient Dashboard**
   - Intake + consents now make sense

This feels natural and trustworthy.

## Benefits of This Architecture

✅ **Clean lifecycle separation**  
✅ **Strong business funnel**  
✅ **Better conversion**  
✅ **Cleaner compliance boundaries**  
✅ **Easier consent logic**  
✅ **Easier auditing**  
✅ **More professional system**  
✅ **Easier scaling later**

## Implementation Status

### Database ✅
- Schema already supports this (`user_id` nullable on Patient)
- `User.patient_profile` is optional relation
- Architecture is correct

### Frontend ⚠️
- Currently redirects all users to `/patient/dashboard` after signup
- Needs Client Portal routes (`/portal/*`)
- Needs intelligent routing (check PatientProfile)

### Next Steps
1. Build Client Portal (`/portal/welcome`, `/portal/book-consultation`, etc.)
2. Create utility to check if user has PatientProfile
3. Update login/register redirects to use intelligent routing
4. Protect `/patient/*` routes to require PatientProfile

This is exactly how serious healthcare platforms structure themselves.
