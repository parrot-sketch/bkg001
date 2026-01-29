# Patient Intake Form - Enterprise-Grade Implementation Plan

## 1. Architecture Overview

### Clean Architecture Layers

```
┌─────────────────────────────────────────────────────┐
│                 UI LAYER                            │
│  (React Components, Forms, Page Routes)            │
├─────────────────────────────────────────────────────┤
│              APPLICATION LAYER                      │
│  (Use Cases, DTOs, Business Logic Orchestration)   │
├─────────────────────────────────────────────────────┤
│              DOMAIN LAYER                           │
│  (Entities, Value Objects, Domain Rules)           │
├─────────────────────────────────────────────────────┤
│           INFRASTRUCTURE LAYER                      │
│  (Repositories, Mappers, External Services)        │
└─────────────────────────────────────────────────────┘
```

### Design Patterns Used

1. **Domain-Driven Design (DDD)**
   - Patient entity as aggregate root
   - Value objects for Email, PhoneNumber
   - Domain exceptions for validation

2. **Repository Pattern**
   - Interface-based repository contracts
   - Separation of persistence concerns
   - Easy to mock for testing

3. **Mapper Pattern**
   - DTOs for API communication
   - Entities for domain logic
   - Strict separation of concerns

4. **Use Case Pattern**
   - Single responsibility (SOLID)
   - Clear input/output contracts
   - Testable in isolation

5. **Factory Pattern**
   - Patient.create() for entity creation
   - Centralized validation
   - Immutability guarantee

---

## 2. Data Structure (Reusing Existing Patient Entity)

### Patient Entity Fields

```typescript
// REQUIRED FIELDS
├─ Personal Information
│  ├─ firstName: string
│  ├─ lastName: string
│  ├─ dateOfBirth: Date
│  ├─ gender: Gender (MALE | FEMALE)
│  ├─ email: Email (value object)
│  └─ phone: PhoneNumber (value object)
│
├─ Contact Information
│  ├─ address: string
│  ├─ maritalStatus: string
│  └─ occupation?: string (optional)
│
├─ Emergency Contact
│  ├─ emergencyContactName: string
│  ├─ emergencyContactNumber: PhoneNumber
│  └─ relation: string
│
├─ Medical Information
│  ├─ bloodGroup?: string (optional)
│  ├─ allergies?: string (optional)
│  ├─ medicalConditions?: string (optional)
│  └─ medicalHistory?: string (optional)
│
├─ Insurance
│  ├─ insuranceProvider?: string (optional)
│  └─ insuranceNumber?: string (optional)
│
├─ Communication
│  ├─ whatsappPhone?: string (optional)
│  └─ (future: SMS consent, email consent)
│
└─ Consent & Legal
   ├─ privacyConsent: boolean (REQUIRED)
   ├─ serviceConsent: boolean (REQUIRED)
   └─ medicalConsent: boolean (REQUIRED)
```

---

## 3. Implementation Layer Breakdown

### 3.1 Domain Layer (No Changes - Already Exists)

**Location:** `/domain/entities/Patient.ts`

**Responsibility:** Pure business logic and validation
- Patient entity with factory method
- Value objects (Email, PhoneNumber)
- Immutable state
- Domain exceptions

**Key Methods Already Exist:**
```typescript
Patient.create(params) // Factory with validation
patient.getFirstName()
patient.getEmail()
patient.hasMedicalConsent()
// ... etc
```

**Status:** ✅ Ready to use

---

### 3.2 Application Layer (NEW)

#### A. DTOs (Data Transfer Objects)

**Location:** `/application/dtos/PatientIntakeSubmissionDto.ts` (NEW)

```typescript
/**
 * DTO: PatientIntakeSubmissionDto
 * 
 * Represents patient intake form submission from frontdesk
 * Captures what patient fills in the form
 */
export interface PatientIntakeSubmissionDto {
  readonly sessionId: string; // References IntakeSession
  
  // Personal Information
  readonly firstName: string;
  readonly lastName: string;
  readonly dateOfBirth: Date;
  readonly gender: 'MALE' | 'FEMALE';
  readonly email: string;
  readonly phone: string;
  
  // Contact Information
  readonly address: string;
  readonly maritalStatus: string;
  readonly occupation?: string;
  readonly whatsappPhone?: string;
  
  // Emergency Contact
  readonly emergencyContactName: string;
  readonly emergencyContactNumber: string;
  readonly relation: string;
  
  // Medical Information
  readonly bloodGroup?: string;
  readonly allergies?: string;
  readonly medicalConditions?: string;
  readonly medicalHistory?: string;
  
  // Insurance
  readonly insuranceProvider?: string;
  readonly insuranceNumber?: string;
  
  // Consent & Legal
  readonly privacyConsent: boolean;
  readonly serviceConsent: boolean;
  readonly medicalConsent: boolean;
  
  // System Fields
  readonly submittedAt: Date;
  readonly ipAddress?: string;
  readonly userAgent?: string;
}

export interface PatientIntakeSessionDto {
  readonly sessionId: string;
  readonly qrCodeUrl: string;
  readonly intakeFormUrl: string;
  readonly expiresAt: Date;
}
```

**Location:** `/application/dtos/PatientIntakePendingDto.ts` (NEW)

```typescript
/**
 * DTO: PatientIntakePendingDto
 * 
 * What frontdesk sees when reviewing pending intakes
 */
export interface PatientIntakePendingDto {
  readonly sessionId: string;
  readonly submittedAt: Date;
  readonly patientData: PatientIntakeSubmissionDto;
  readonly completenessScore: number; // 0-100
  readonly missingFields: string[];
}
```

---

#### B. Use Cases

**Location:** `/application/use-cases/StartPatientIntakeUseCase.ts` (NEW)

```typescript
/**
 * Use Case: Start Patient Intake
 * 
 * Triggered by: Frontdesk user clicks "New Walk-in Patient"
 * Input: None (session created automatically)
 * Output: Session info with QR code and intake URL
 * 
 * Flow:
 * 1. Generate unique sessionId (UUID)
 * 2. Set expiration (1 hour from now)
 * 3. Generate intake form URL
 * 4. Encode URL as QR code
 * 5. Return session to frontdesk
 */
export class StartPatientIntakeUseCase {
  constructor(
    private readonly intakeSessionRepository: IIntakeSessionRepository,
    private readonly qrCodeGenerator: IQrCodeGenerator,
  ) {}

  async execute(): Promise<PatientIntakeSessionDto> {
    // Validate permissions (only frontdesk can start intake)
    // Generate session
    // Create QR code
    // Return DTO
  }
}
```

**Location:** `/application/use-cases/SubmitPatientIntakeUseCase.ts` (NEW)

```typescript
/**
 * Use Case: Submit Patient Intake Form
 * 
 * Triggered by: Patient submits form from `/patient/intake?sessionId=xyz`
 * Input: Session ID + Form data
 * Output: Confirmation + Created pending intake record
 * 
 * Flow:
 * 1. Validate session exists and not expired
 * 2. Validate form data (using Zod schema)
 * 3. Map to PatientIntakeSubmissionDto
 * 4. Store in database
 * 5. Mark session as SUBMITTED
 * 6. Return confirmation
 * 7. (Optional) Emit IntakeSubmittedEvent for notifications
 */
export class SubmitPatientIntakeUseCase {
  constructor(
    private readonly intakeSessionRepository: IIntakeSessionRepository,
    private readonly intakeSubmissionRepository: IIntakeSubmissionRepository,
    private readonly eventBus: IEventBus,
  ) {}

  async execute(
    input: SubmitPatientIntakeInput
  ): Promise<PatientIntakeSubmissionDto> {
    // Validate session
    // Validate data
    // Store submission
    // Emit event
    // Return DTO
  }
}
```

**Location:** `/application/use-cases/ReviewPatientIntakeUseCase.ts` (NEW)

```typescript
/**
 * Use Case: Review Patient Intake (Frontdesk)
 * 
 * Triggered by: Frontdesk clicks on pending intake
 * Input: Session ID
 * Output: Full intake data for review
 * 
 * Flow:
 * 1. Validate frontdesk permission
 * 2. Fetch intake submission
 * 3. Analyze completeness
 * 4. Calculate missing fields
 * 5. Return DTO with analysis
 */
export class ReviewPatientIntakeUseCase {
  constructor(
    private readonly intakeSubmissionRepository: IIntakeSubmissionRepository,
  ) {}

  async execute(
    input: ReviewPatientIntakeInput
  ): Promise<PatientIntakePendingDto> {
    // Fetch intake
    // Analyze data
    // Return DTO
  }
}
```

**Location:** `/application/use-cases/ConfirmPatientIntakeUseCase.ts` (NEW)

```typescript
/**
 * Use Case: Confirm Patient Intake (Create Patient Record)
 * 
 * Triggered by: Frontdesk clicks [Confirm] button
 * Input: Session ID + (optional) corrections
 * Output: Created Patient record
 * 
 * Flow:
 * 1. Validate frontdesk permission
 * 2. Fetch intake submission
 * 3. (Optional) Apply corrections from frontdesk
 * 4. Validate complete data
 * 5. Create Patient entity
 * 6. Save to repository
 * 7. Mark session as CONFIRMED
 * 8. Return Patient DTO
 * 9. Emit PatientCreatedEvent
 */
export class ConfirmPatientIntakeUseCase {
  constructor(
    private readonly intakeSubmissionRepository: IIntakeSubmissionRepository,
    private readonly intakeSessionRepository: IIntakeSessionRepository,
    private readonly patientRepository: IPatientRepository,
    private readonly eventBus: IEventBus,
  ) {}

  async execute(
    input: ConfirmPatientIntakeInput
  ): Promise<PatientResponseDto> {
    // Validate session and submission
    // Create Patient entity (uses existing factory)
    // Save patient
    // Update session status
    // Emit event
    // Return DTO
  }
}
```

---

### 3.3 Infrastructure Layer (NEW)

#### A. Repositories

**Location:** `/infrastructure/repositories/IIntakeSessionRepository.ts` (NEW)

```typescript
export interface IIntakeSessionRepository {
  create(session: IntakeSession): Promise<IntakeSession>;
  findById(sessionId: string): Promise<IntakeSession | null>;
  updateStatus(sessionId: string, status: IntakeSessionStatus): Promise<void>;
  markAsExpired(sessionId: string): Promise<void>;
}

// Implementation
export class PrismaIntakeSessionRepository implements IIntakeSessionRepository {
  constructor(private readonly db: PrismaClient) {}
  
  async create(session: IntakeSession): Promise<IntakeSession> {
    return this.db.intakeSession.create({ data: ... });
  }
  // ... other methods
}
```

**Location:** `/infrastructure/repositories/IIntakeSubmissionRepository.ts` (NEW)

```typescript
export interface IIntakeSubmissionRepository {
  create(submission: IntakeSubmission): Promise<IntakeSubmission>;
  findBySessionId(sessionId: string): Promise<IntakeSubmission | null>;
  findPending(limit: number, offset: number): Promise<IntakeSubmission[]>;
  countPending(): Promise<number>;
  updateStatus(submissionId: string, status: string): Promise<void>;
}

// Implementation
export class PrismaIntakeSubmissionRepository 
  implements IIntakeSubmissionRepository {
  constructor(private readonly db: PrismaClient) {}
  
  async create(submission: IntakeSubmission): Promise<IntakeSubmission> {
    return this.db.intakeSubmission.create({ data: ... });
  }
  // ... other methods
}
```

---

#### B. Mappers

**Location:** `/infrastructure/mappers/IntakeSessionMapper.ts` (NEW)

```typescript
/**
 * Mapper: IntakeSession
 * 
 * Maps between:
 * - Domain: IntakeSession entity
 * - Persistence: Prisma IntakeSession model
 * - API: PatientIntakeSessionDto
 */
export class IntakeSessionMapper {
  static toDomain(raw: PrismaIntakeSession): IntakeSession {
    return IntakeSession.create({
      sessionId: raw.session_id,
      status: raw.status as IntakeSessionStatus,
      createdAt: raw.created_at,
      expiresAt: raw.expires_at,
      // ...
    });
  }

  static toPersistence(session: IntakeSession): Prisma.IntakeSessionCreateInput {
    return {
      session_id: session.getSessionId(),
      status: session.getStatus(),
      created_at: session.getCreatedAt(),
      expires_at: session.getExpiresAt(),
      // ...
    };
  }

  static toDto(session: IntakeSession, qrCodeUrl: string): PatientIntakeSessionDto {
    return {
      sessionId: session.getSessionId(),
      qrCodeUrl,
      intakeFormUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/patient/intake?sessionId=${session.getSessionId()}`,
      expiresAt: session.getExpiresAt(),
    };
  }
}
```

**Location:** `/infrastructure/mappers/IntakeSubmissionMapper.ts` (NEW)

```typescript
/**
 * Mapper: IntakeSubmission
 * 
 * Maps between:
 * - Domain: IntakeSubmission aggregate
 * - Persistence: Prisma IntakeSubmission model
 * - API: PatientIntakeSubmissionDto
 */
export class IntakeSubmissionMapper {
  static toDomain(raw: PrismaIntakeSubmission): IntakeSubmission {
    return IntakeSubmission.create({
      sessionId: raw.session_id,
      personalInfo: { ... },
      medicalInfo: { ... },
      consent: { ... },
      // ...
    });
  }

  static toPersistence(submission: IntakeSubmission): Prisma.IntakeSubmissionCreateInput {
    return {
      session_id: submission.getSessionId(),
      first_name: submission.getFirstName(),
      last_name: submission.getLastName(),
      // ... all fields
    };
  }

  static toDto(submission: IntakeSubmission): PatientIntakeSubmissionDto {
    return {
      sessionId: submission.getSessionId(),
      firstName: submission.getFirstName(),
      lastName: submission.getLastName(),
      // ... all fields
    };
  }

  /**
   * Used when creating Patient entity from intake
   * Converts IntakeSubmission → Patient.CreateInput
   */
  static toPatientCreateInput(submission: IntakeSubmission): Patient.CreateInput {
    return {
      firstName: submission.getFirstName(),
      lastName: submission.getLastName(),
      dateOfBirth: submission.getDateOfBirth(),
      gender: submission.getGender(),
      email: submission.getEmail(),
      phone: submission.getPhone(),
      // ... all fields
    };
  }
}
```

---

#### C. QR Code Generator

**Location:** `/infrastructure/services/QrCodeGeneratorService.ts` (NEW)

```typescript
export interface IQrCodeGenerator {
  generate(data: string): Promise<string>; // Returns base64 PNG
}

export class QrCodeGeneratorService implements IQrCodeGenerator {
  async generate(data: string): Promise<string> {
    const qr = qrcode;
    return await qr.toDataURL(data, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 1,
    });
  }
}
```

---

### 3.4 UI Layer (NEW)

#### A. Patient Intake Form Page

**Location:** `/app/patient/intake/page.tsx` (NEW)

```typescript
/**
 * Page: Patient Intake Form
 * 
 * Public page accessed via:
 * - Direct URL: https://yoursite.com/patient/intake?sessionId=xyz
 * - QR code scan (encodes above URL)
 * - WhatsApp link (future)
 * 
 * Key Requirements:
 * - Private (patient fills alone)
 * - No frontdesk involvement
 * - Clear, reassuring messaging
 * - Mobile/tablet optimized
 * - Form validation
 * - Session management
 */

export default function PatientIntakePage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  
  // Validate session
  // Fetch form fields metadata
  // Render form sections
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5">
      {/* Privacy Message */}
      {/* Form Component */}
      {/* Submit Button */}
      {/* Success Screen */}
    </div>
  );
}
```

#### B. Patient Intake Form Component

**Location:** `/components/patient/PatientIntakeForm.tsx` (NEW)

```typescript
/**
 * Component: PatientIntakeForm
 * 
 * Multi-section form with:
 * - Form validation (Zod schema)
 * - Progress indicator
 * - Section collapsing
 * - Auto-save (draft)
 * - Clear error messages
 * - Accessibility (ARIA labels, semantic HTML)
 */

export function PatientIntakeForm({ sessionId }: { sessionId: string }) {
  const [formData, setFormData] = useState<PatientIntakeFormData>(initialState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (data: PatientIntakeFormData) => {
    try {
      setIsSubmitting(true);
      await api.post('/api/patient/intake', {
        sessionId,
        ...data,
      });
      setSubmitted(true);
    } catch (error) {
      setErrors(parseErrorResponse(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return <IntakeSuccessScreen />;
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(formData); }}>
      <FormSection title="Personal Information">
        <FormField name="firstName" label="First Name" required />
        <FormField name="lastName" label="Last Name" required />
        <FormField name="dateOfBirth" label="Date of Birth" type="date" required />
        <FormField name="gender" label="Gender" type="select" required />
      </FormSection>

      <FormSection title="Contact Information">
        <FormField name="email" label="Email" type="email" required />
        <FormField name="phone" label="Phone" type="tel" required />
        <FormField name="whatsappPhone" label="WhatsApp (Optional)" type="tel" />
        <FormField name="address" label="Address" type="textarea" required />
      </FormSection>

      {/* ... more sections ... */}

      <ConsentSection />
      <SubmitButton disabled={isSubmitting} />
    </form>
  );
}
```

#### C. Intake Form Sections

**Location:** `/components/patient/intake/PersonalInfoSection.tsx` (NEW)
**Location:** `/components/patient/intake/MedicalHistorySection.tsx` (NEW)
**Location:** `/components/patient/intake/ConsentSection.tsx` (NEW)
**Location:** `/components/patient/intake/ConfirmationSection.tsx` (NEW)

Each section:
- Focused on single concern
- Proper spacing
- Clear labels
- Helpful descriptions
- Conditional fields (optional vs required)

---

#### D. Frontdesk Dashboard Updates

**Location:** `/app/frontdesk/dashboard/page.tsx` (MODIFY)

Add quick action cards:
```tsx
{/* New: Patient Intake Action Cards */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <QuickActionCard 
    title="New Walk-in Patient"
    icon={<UserPlus />}
    onClick={() => router.push('/frontdesk/intake/start')}
  />
  
  {pendingIntakes > 0 && (
    <QuickActionCard 
      title="Pending Intakes"
      count={pendingIntakes}
      icon={<FileText />}
      onClick={() => router.push('/frontdesk/intake/pending')}
    />
  )}
  
  {readyToConfirm > 0 && (
    <QuickActionCard 
      title="Ready to Confirm"
      count={readyToConfirm}
      icon={<CheckCircle />}
      onClick={() => router.push('/frontdesk/intake/pending?filter=ready')}
    />
  )}
</div>
```

#### E. Frontdesk Intake Management Pages

**Location:** `/app/frontdesk/intake/start/page.tsx` (NEW)
- Shows QR code
- Displays intake URL
- Copy to clipboard button
- Send via WhatsApp option (future)

**Location:** `/app/frontdesk/intake/pending/page.tsx` (NEW)
- List of pending intakes
- Filter by status
- Review individual intakes
- Confirm/edit actions

**Location:** `/app/frontdesk/intake/review/[sessionId]/page.tsx` (NEW)
- Full intake review
- Verify data
- Edit if needed
- [Confirm] button → creates patient

---

### 3.5 Validation Layer

**Location:** `/lib/schemas/PatientIntakeSchema.ts` (NEW)

```typescript
import { z } from 'zod';

export const PatientIntakeSchema = z.object({
  // Personal Information
  firstName: z
    .string()
    .trim()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be at most 50 characters'),
  
  lastName: z
    .string()
    .trim()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be at most 50 characters'),
  
  dateOfBirth: z
    .coerce.date()
    .max(new Date(), 'Date of birth cannot be in the future')
    .refine(
      (date) => {
        const age = new Date().getFullYear() - date.getFullYear();
        return age >= 16; // Minimum age 16
      },
      'Patient must be at least 16 years old'
    ),
  
  gender: z.enum(['MALE', 'FEMALE'], {
    errorMap: () => ({ message: 'Please select a gender' }),
  }),
  
  // Contact Information
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase(),
  
  phone: z
    .string()
    .regex(/^\d{10}$/, 'Phone must be 10 digits'),
  
  whatsappPhone: z
    .string()
    .regex(/^\d{10}$/, 'WhatsApp phone must be 10 digits')
    .optional()
    .or(z.literal('')),
  
  address: z
    .string()
    .trim()
    .min(10, 'Address must be at least 10 characters')
    .max(500, 'Address must be at most 500 characters'),
  
  maritalStatus: z
    .enum(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'], {
      errorMap: () => ({ message: 'Please select marital status' }),
    }),
  
  occupation: z
    .string()
    .trim()
    .max(100, 'Occupation must be at most 100 characters')
    .optional()
    .or(z.literal('')),
  
  // Emergency Contact
  emergencyContactName: z
    .string()
    .trim()
    .min(2, 'Emergency contact name must be at least 2 characters')
    .max(50, 'Emergency contact name must be at most 50 characters'),
  
  emergencyContactNumber: z
    .string()
    .regex(/^\d{10}$/, 'Emergency contact phone must be 10 digits'),
  
  relation: z
    .enum(['SPOUSE', 'PARENT', 'CHILD', 'SIBLING', 'FRIEND', 'OTHER'], {
      errorMap: () => ({ message: 'Please select relationship' }),
    }),
  
  // Medical Information
  bloodGroup: z
    .enum(['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'], {
      errorMap: () => ({ message: 'Please select valid blood group' }),
    })
    .optional()
    .or(z.literal('')),
  
  allergies: z
    .string()
    .trim()
    .max(500, 'Allergies description must be at most 500 characters')
    .optional()
    .or(z.literal('')),
  
  medicalConditions: z
    .string()
    .trim()
    .max(500, 'Medical conditions must be at most 500 characters')
    .optional()
    .or(z.literal('')),
  
  medicalHistory: z
    .string()
    .trim()
    .max(1000, 'Medical history must be at most 1000 characters')
    .optional()
    .or(z.literal('')),
  
  // Insurance
  insuranceProvider: z
    .string()
    .trim()
    .max(100, 'Insurance provider must be at most 100 characters')
    .optional()
    .or(z.literal('')),
  
  insuranceNumber: z
    .string()
    .trim()
    .max(100, 'Insurance number must be at most 100 characters')
    .optional()
    .or(z.literal('')),
  
  // Consent (REQUIRED)
  privacyConsent: z
    .boolean()
    .refine((val) => val === true, {
      message: 'You must agree to the privacy policy',
    }),
  
  serviceConsent: z
    .boolean()
    .refine((val) => val === true, {
      message: 'You must agree to service terms',
    }),
  
  medicalConsent: z
    .boolean()
    .refine((val) => val === true, {
      message: 'You must agree to medical information processing',
    }),
});

export type PatientIntakeFormData = z.infer<typeof PatientIntakeSchema>;
```

---

## 4. API Endpoints

**Location:** `/app/api/frontdesk/intake/start/route.ts` (NEW)

```typescript
/**
 * POST /api/frontdesk/intake/start
 * 
 * Frontdesk initiates patient intake
 * 
 * Response:
 * {
 *   sessionId: "abc123xyz",
 *   qrCodeUrl: "data:image/png;base64,...",
 *   intakeFormUrl: "https://yoursite.com/patient/intake?sessionId=abc123xyz",
 *   expiresAt: "2026-01-25T11:30:00Z"
 * }
 */
export async function POST(request: Request) {
  // Validate frontdesk auth
  // Call StartPatientIntakeUseCase
  // Return SessionDto with QR code
}
```

**Location:** `/app/api/patient/intake/route.ts` (NEW)

```typescript
/**
 * POST /api/patient/intake
 * 
 * Patient submits intake form
 * 
 * Body:
 * {
 *   sessionId: "abc123xyz",
 *   firstName: "...",
 *   lastName: "...",
 *   ... all form fields
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   message: "Intake submitted successfully"
 * }
 */
export async function POST(request: Request) {
  const body = await request.json();
  
  // Validate session exists
  // Validate form data (PatientIntakeSchema)
  // Call SubmitPatientIntakeUseCase
  // Return confirmation
}
```

**Location:** `/app/api/frontdesk/intake/pending/route.ts` (NEW)

```typescript
/**
 * GET /api/frontdesk/intake/pending
 * 
 * Frontdesk views pending intakes
 * 
 * Query params:
 * - limit: 20 (default)
 * - offset: 0 (default)
 * - status: SUBMITTED | NEEDS_REVIEW | NEEDS_CORRECTION
 * 
 * Response:
 * {
 *   intakes: [
 *     {
 *       sessionId: "...",
 *       submittedAt: "...",
 *       patientData: {...},
 *       completenessScore: 95,
 *       missingFields: []
 *     }
 *   ],
 *   total: 5,
 *   limit: 20,
 *   offset: 0
 * }
 */
export async function GET(request: Request) {
  // Validate frontdesk auth
  // Parse query params
  // Call ReviewPatientIntakeUseCase (list variant)
  // Return DTOs
}
```

**Location:** `/app/api/frontdesk/intake/confirm/route.ts` (NEW)

```typescript
/**
 * POST /api/frontdesk/intake/confirm
 * 
 * Frontdesk confirms intake & creates patient
 * 
 * Body:
 * {
 *   sessionId: "abc123xyz",
 *   corrections: { ... } (optional, if frontdesk made edits)
 * }
 * 
 * Response:
 * {
 *   patientId: "patient-123",
 *   patient: {...PatientResponseDto},
 *   fileNumber: "NS001"
 * }
 */
export async function POST(request: Request) {
  const body = await request.json();
  
  // Validate frontdesk auth
  // Call ConfirmPatientIntakeUseCase
  // Return created patient
}
```

---

## 5. Database Schema (Prisma)

**Location:** `/prisma/schema.prisma` (ADD)

```prisma
// ============================================================================
// PATIENT INTAKE
// ============================================================================

model IntakeSession {
  id                  String   @id @default(cuid())
  session_id          String   @unique // UUID
  status              String   @default("ACTIVE") // ACTIVE, SUBMITTED, CONFIRMED, EXPIRED
  created_at          DateTime @default(now())
  expires_at          DateTime
  created_by_user_id  String? // Frontdesk user who initiated
  
  submissions         IntakeSubmission[]
  
  @@index([session_id])
  @@index([expires_at])
  @@index([status])
}

model IntakeSubmission {
  id                      String   @id @default(cuid())
  session_id              String
  session                 IntakeSession @relation(fields: [session_id], references: [session_id], onDelete: Cascade)
  
  // Personal Information
  first_name              String
  last_name               String
  date_of_birth           DateTime
  gender                  Gender
  email                   String
  phone                   String
  whatsapp_phone          String?
  
  // Contact Information
  address                 String
  marital_status          String
  occupation              String?
  
  // Emergency Contact
  emergency_contact_name  String
  emergency_contact_number String
  relation                String
  
  // Medical Information
  blood_group             String?
  allergies               String?
  medical_conditions      String?
  medical_history         String?
  
  // Insurance
  insurance_provider      String?
  insurance_number        String?
  
  // Consent
  privacy_consent         Boolean
  service_consent         Boolean
  medical_consent         Boolean
  
  // Audit
  submitted_at            DateTime @default(now())
  ip_address              String?
  user_agent              String?
  
  // Status
  status                  String @default("PENDING") // PENDING, CONFIRMED, REJECTED
  created_patient_id      String? // References Patient(id) after confirmation
  
  created_at              DateTime @default(now())
  updated_at              DateTime @updatedAt
  
  @@unique([session_id]) // One submission per session
  @@index([session_id])
  @@index([status])
  @@index([submitted_at])
}
```

**Migration:** `npx prisma migrate dev --name add_patient_intake_tables`

---

## 6. Domain Entities (Domain Layer)

**Location:** `/domain/entities/IntakeSession.ts` (NEW)

```typescript
/**
 * Entity: IntakeSession
 * 
 * Represents a patient intake session initiated by frontdesk
 * Tracks session lifecycle: ACTIVE → SUBMITTED → CONFIRMED or EXPIRED
 */
export class IntakeSession {
  private constructor(
    private readonly sessionId: string,
    private readonly status: IntakeSessionStatus,
    private readonly createdAt: Date,
    private readonly expiresAt: Date,
    private readonly createdBy?: string,
  ) {}

  static create(params: {
    sessionId: string;
    createdBy?: string;
    expirationMinutes?: number; // default: 60
  }): IntakeSession {
    const expiresAt = new Date();
    expiresAt.setMinutes(
      expiresAt.getMinutes() + (params.expirationMinutes ?? 60)
    );

    return new IntakeSession(
      params.sessionId,
      'ACTIVE',
      new Date(),
      expiresAt,
      params.createdBy,
    );
  }

  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getStatus(): IntakeSessionStatus {
    return this.status;
  }

  // ... other methods
}

export type IntakeSessionStatus = 'ACTIVE' | 'SUBMITTED' | 'CONFIRMED' | 'EXPIRED';
```

**Location:** `/domain/entities/IntakeSubmission.ts` (NEW)

```typescript
/**
 * Entity: IntakeSubmission
 * 
 * Represents patient's filled intake form
 * Contains all personal, medical, and consent information
 */
export class IntakeSubmission {
  private constructor(
    private readonly sessionId: string,
    private readonly personalInfo: PersonalInfo,
    private readonly contactInfo: ContactInfo,
    private readonly emergencyContact: EmergencyContact,
    private readonly medicalInfo: MedicalInfo,
    private readonly insuranceInfo: InsuranceInfo,
    private readonly consent: ConsentInfo,
    private readonly submittedAt: Date,
    private readonly ipAddress?: string,
  ) {}

  static create(params: {
    sessionId: string;
    personalInfo: PersonalInfo;
    contactInfo: ContactInfo;
    emergencyContact: EmergencyContact;
    medicalInfo: MedicalInfo;
    insuranceInfo: InsuranceInfo;
    consent: ConsentInfo;
    ipAddress?: string;
  }): IntakeSubmission {
    // Validate all required fields
    // Validate consent flags
    // Return instance
  }

  toPatientEntity(): Patient {
    // Convert intake submission to Patient entity
    // This is used when frontdesk confirms intake
    return Patient.create({
      firstName: this.personalInfo.firstName,
      lastName: this.personalInfo.lastName,
      // ... map all fields
    });
  }

  // ... getter methods
}

// Value Objects
class PersonalInfo { /* ... */ }
class ContactInfo { /* ... */ }
class EmergencyContact { /* ... */ }
class MedicalInfo { /* ... */ }
class InsuranceInfo { /* ... */ }
class ConsentInfo {
  privacy: boolean;
  service: boolean;
  medical: boolean;
}
```

---

## 7. Testing Strategy

### Unit Tests

**Location:** `/__tests__/domain/entities/IntakeSession.test.ts`

```typescript
describe('IntakeSession', () => {
  it('should create a valid intake session', () => {
    const session = IntakeSession.create({
      sessionId: 'test-123',
      expirationMinutes: 60,
    });

    expect(session.getSessionId()).toBe('test-123');
    expect(session.isExpired()).toBe(false);
  });

  it('should detect expired sessions', () => {
    const session = IntakeSession.create({
      sessionId: 'test-123',
      expirationMinutes: -1, // Already expired
    });

    expect(session.isExpired()).toBe(true);
  });
});
```

### Integration Tests

**Location:** `/__tests__/integration/patient-intake.test.ts`

```typescript
describe('Patient Intake Workflow', () => {
  it('should complete full intake flow: start → submit → confirm', async () => {
    // 1. Frontdesk starts intake
    const sessionDto = await startIntakeUseCase.execute();
    expect(sessionDto.sessionId).toBeDefined();
    expect(sessionDto.qrCodeUrl).toBeDefined();

    // 2. Patient submits form
    const submissionDto = await submitIntakeUseCase.execute({
      sessionId: sessionDto.sessionId,
      firstName: 'John',
      lastName: 'Doe',
      // ... all fields
    });
    expect(submissionDto.sessionId).toBe(sessionDto.sessionId);

    // 3. Frontdesk confirms
    const patientDto = await confirmIntakeUseCase.execute({
      sessionId: sessionDto.sessionId,
    });
    expect(patientDto.patientId).toBeDefined();
    expect(patientDto.fileNumber).toMatch(/^NS\d+$/);
  });
});
```

### E2E Tests

**Location:** `/e2e/patient-intake.spec.ts` (Playwright)

```typescript
test('Patient intake workflow from start to confirmation', async ({ page, browser }) => {
  // 1. Frontdesk initiates
  await page.goto('/frontdesk/dashboard');
  await page.click('[data-testid="new-walkin-patient"]');
  
  // Get QR code URL
  const qrCodeUrl = await page.getAttribute('[data-testid="qr-code"]', 'src');
  expect(qrCodeUrl).toContain('data:image/png');

  // 2. Patient scans and fills form (in another browser context)
  const patientPage = await browser.newPage();
  await patientPage.goto(intakeFormUrl);
  await patientPage.fill('[name="firstName"]', 'John');
  await patientPage.fill('[name="lastName"]', 'Doe');
  // ... fill all fields
  await patientPage.click('[data-testid="submit"]');
  
  // Verify success screen
  await expect(patientPage.locator('text=Thank you')).toBeVisible();

  // 3. Frontdesk confirms (back in original page)
  await page.goto('/frontdesk/intake/pending');
  await page.click(`[data-testid="intake-John-Doe"]`);
  await page.click('[data-testid="confirm"]');
  
  // Verify patient created
  const successMessage = page.locator('text=Patient created successfully');
  await expect(successMessage).toBeVisible();
});
```

---

## 8. Security Considerations

### Session Management
```typescript
// Session expires after 1 hour
const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

// Validate session not expired on submission
if (session.isExpired()) {
  throw new DomainException('Intake session has expired');
}

// Only allow one submission per session
if (session.hasSubmission()) {
  throw new DomainException('Intake already submitted for this session');
}
```

### Data Privacy
```typescript
// GDPR-compliant data handling
- Never log sensitive medical data
- Encrypt sensitive fields at rest
- Use HTTPS only
- IP address logged for audit only
- Automatic session cleanup after 24 hours
```

### Input Validation
```typescript
// Multi-layer validation
1. Client-side: Zod schema (instant feedback)
2. Server-side: Zod schema (security)
3. Domain: Patient.create() (business rules)
4. Database: Constraints (final safety net)
```

### Rate Limiting
```typescript
// Prevent abuse
- 10 intake starts per user per day
- 5 submissions per session
- IP-based rate limiting on submission endpoint
```

---

## 9. Implementation Roadmap

### Phase 1: MVP (Week 1)
- [ ] Domain entities (IntakeSession, IntakeSubmission)
- [ ] Repositories and mappers
- [ ] Use cases (Start, Submit, Confirm)
- [ ] Patient intake form UI (simple version)
- [ ] API endpoints
- [ ] Database schema + migration

### Phase 2: Polish (Week 2)
- [ ] Form sections (Personal, Medical, Consent)
- [ ] Form validation (Zod schema)
- [ ] Error handling and user messaging
- [ ] Frontdesk intake management pages
- [ ] QR code generation
- [ ] Success/confirmation screens

### Phase 3: Enhancement (Week 3)
- [ ] Auto-save form (draft functionality)
- [ ] PDF export (for patient records)
- [ ] WhatsApp integration (send link)
- [ ] Email confirmation
- [ ] Form analytics (completion rate, drop-off points)

### Phase 4: Integration (Week 4)
- [ ] Dashboard quick actions
- [ ] Pending intake badge/counter
- [ ] Direct booking after intake confirmation
- [ ] Patient profile pre-population for existing patients
- [ ] Testing and QA

---

## 10. File Structure Summary

```
/domain/entities/
  ├─ IntakeSession.ts (NEW)
  └─ IntakeSubmission.ts (NEW)

/domain/value-objects/
  └─ (use existing Email, PhoneNumber)

/application/use-cases/
  ├─ StartPatientIntakeUseCase.ts (NEW)
  ├─ SubmitPatientIntakeUseCase.ts (NEW)
  ├─ ReviewPatientIntakeUseCase.ts (NEW)
  └─ ConfirmPatientIntakeUseCase.ts (NEW)

/application/dtos/
  ├─ PatientIntakeSessionDto.ts (NEW)
  ├─ PatientIntakeSubmissionDto.ts (NEW)
  └─ PatientIntakePendingDto.ts (NEW)

/infrastructure/repositories/
  ├─ IIntakeSessionRepository.ts (NEW)
  ├─ PrismaIntakeSessionRepository.ts (NEW)
  ├─ IIntakeSubmissionRepository.ts (NEW)
  └─ PrismaIntakeSubmissionRepository.ts (NEW)

/infrastructure/mappers/
  ├─ IntakeSessionMapper.ts (NEW)
  └─ IntakeSubmissionMapper.ts (NEW)

/infrastructure/services/
  └─ QrCodeGeneratorService.ts (NEW)

/app/patient/intake/
  └─ page.tsx (NEW)

/app/frontdesk/intake/
  ├─ start/page.tsx (NEW)
  ├─ pending/page.tsx (NEW)
  └─ review/[sessionId]/page.tsx (NEW)

/app/api/patient/intake/
  └─ route.ts (NEW)

/app/api/frontdesk/intake/
  ├─ start/route.ts (NEW)
  ├─ pending/route.ts (NEW)
  └─ confirm/route.ts (NEW)

/components/patient/
  ├─ PatientIntakeForm.tsx (NEW)
  ├─ intake/PersonalInfoSection.tsx (NEW)
  ├─ intake/MedicalHistorySection.tsx (NEW)
  ├─ intake/ConsentSection.tsx (NEW)
  └─ intake/ConfirmationSection.tsx (NEW)

/lib/schemas/
  └─ PatientIntakeSchema.ts (NEW)

/lib/services/
  └─ (add QrCodeGeneratorService if not in infrastructure)

/__tests__/
  ├─ domain/IntakeSession.test.ts (NEW)
  └─ integration/patient-intake.test.ts (NEW)

/e2e/
  └─ patient-intake.spec.ts (NEW)

/prisma/
  └─ schema.prisma (MODIFY - add intake tables)
```

---

## Conclusion

This is an **enterprise-grade implementation** following:
- ✅ Clean Architecture (layered)
- ✅ Domain-Driven Design
- ✅ SOLID principles
- ✅ Repository pattern
- ✅ Mapper pattern
- ✅ Use case pattern
- ✅ Strict validation (Zod + domain)
- ✅ Security best practices
- ✅ Testability
- ✅ Maintainability

The implementation reuses your existing Patient entity, repositories, and validation patterns while adding focused domain logic for patient intake management.
