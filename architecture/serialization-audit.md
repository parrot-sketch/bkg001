# Serialization Audit

## Purpose
Audit every object crossing the server/client boundary to verify JSON serialization compatibility. Identify incompatible fields: Dates, Maps, Sets, Classes, Error objects, Functions, undefined values.

---

## 1. Boundary Objects Inventory

| Object | Current Path | Serialized Path | Direction |
|--------|--------------|-----------------|-----------|
| `SessionData` | SessionService → SessionProvider | Server → Client | Downstream |
| `SessionInitializationResult` | SessionService → SessionProvider | Server → Client | Downstream |
| `SessionCompletionResult` | SessionService → SessionProvider | Server → Client | Downstream |
| `SessionSwitchResult` | SessionService → SessionProvider | Server → Client | Downstream |
| `AppointmentResponseDto` | API → SessionService → SessionProvider | Server → Client | Downstream |
| `PatientResponseDto` | API → SessionService → SessionProvider | Server → Client | Downstream |
| `ConsultationResponseDto` | API → SessionService → SessionProvider | Server → Client | Downstream |
| `VitalsData` | API → SessionService → SessionProvider | Server → Client | Downstream |
| `StructuredNotes` | DraftService → SessionProvider | Server → Client | Downstream |
| `WorkflowState` (enum) | WorkflowEngine → SessionProvider | Server → Client | Downstream |
| `BillingSummary` | API → BillingProvider | Server → Client | Downstream |
| `QueueSnapshot` | React Query → QueueProvider | Client → Client | Internal |
| `DialogState` | DialogProvider | Client → Client | Internal |

**Focus: Objects crossing server/client boundary (Downstream).**

---

## 2. Field-by-Field Serialization Analysis

### SessionData

```typescript
interface SessionData {
  readonly appointment: { /* AppointmentResponseDto */ };
  readonly patient: { /* PatientResponseDto */ };
  readonly vitals: VitalsData | null;
  readonly consultation: { /* ConsultationResponseDto */ } | null;
  readonly doctorId: string;
  readonly workflowState: ConsultationWorkflowState; // string enum
  readonly isDirty: boolean;
  readonly draftAvailable: boolean;
  readonly notes: StructuredNotes; // plain object
  readonly outcomeType: ConsultationOutcomeType | null; // string enum
  readonly patientDecision: PatientDecision | null; // string enum
}
```

**Serialization verdict:** ✅ Fully JSON-serializable.

| Field | Type | Serializable? | Notes |
|-------|------|---------------|-------|
| `appointment` | Object (nested) | ✅ | Contains Date fields → must serialize to ISO strings |
| `patient` | Object (nested) | ✅ | Contains Date fields → must serialize to ISO strings |
| `vitals` | Object \| null | ✅ | Already uses ISO strings for `recordedAt` |
| `consultation` | Object \| null | ✅ | Contains Date fields → must serialize to ISO strings |
| `doctorId` | `string` | ✅ | |
| `workflowState` | `ConsultationWorkflowState` enum | ✅ | Enums are string constants |
| `isDirty` | `boolean` | ✅ | |
| `draftAvailable` | `boolean` | ✅ | |
| `notes` | `StructuredNotes` | ✅ | Plain object |
| `outcomeType` | `ConsultationOutcomeType` enum | ✅ | |
| `patientDecision` | `PatientDecision` enum | ✅ | |

### AppointmentResponseDto

```typescript
interface AppointmentResponseDto {
  readonly id: number;
  readonly patientId: string;
  readonly doctorId: string;
  readonly appointmentDate: Date;           // ⚠️ MUST SERIALIZE
  readonly time: string;
  readonly status: string;
  readonly type: string;
  readonly note?: string;
  readonly reason?: string;
  readonly consultationRequestStatus?: ConsultationRequestStatus; // enum
  readonly reviewedBy?: string;
  readonly reviewedAt?: Date;               // ⚠️ MUST SERIALIZE
  readonly bookedBy?: { ... };
  readonly createdAt?: Date;                // ⚠️ MUST SERIALIZE
  readonly updatedAt?: Date;                // ⚠️ MUST SERIALIZE
  readonly checkedInAt?: Date;              // ⚠️ MUST SERIALIZE
  readonly checkedInBy?: string;
  readonly consultationStartedAt?: Date;    // ⚠️ MUST SERIALIZE
  readonly consultationEndedAt?: Date;      // ⚠️ MUST SERIALIZE
  readonly consultationDuration?: number;
  readonly patient?: { ... };              // nested object with Dates
  readonly doctor?: { ... };               // nested object (no Dates)
  readonly slotAllocation?: { ... };       // nested object (no Dates)
}
```

**Serialization verdict:** ⚠️ Requires Date-to-ISO-string conversion for 7 Date fields.

| Field | Current Type | Must Be | Action |
|-------|-------------|---------|--------|
| `appointmentDate` | `Date` | `string` (ISO) | Convert via `date.toISOString()` |
| `reviewedAt` | `Date` | `string` (ISO) | Convert |
| `createdAt` | `Date` | `string` (ISO) | Convert |
| `updatedAt` | `Date` | `string` (ISO) | Convert |
| `checkedInAt` | `Date` | `string` (ISO) | Convert |
| `consultationStartedAt` | `Date` | `string` (ISO) | Convert |
| `consultationEndedAt` | `Date` | `string` (ISO) | Convert |

**Nested patient Dates:** `patient.dateOfBirth` is `Date` in the source but may already be string in API response. Verify actual runtime type.

### PatientResponseDto

```typescript
interface PatientResponseDto {
  readonly id: string;
  readonly fileNumber: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly fullName: string;
  readonly dateOfBirth: Date;               // ⚠️ MUST SERIALIZE
  readonly age: number;
  readonly gender: string;
  readonly email: string;
  readonly phone: string;
  readonly whatsappPhone?: string;
  readonly address?: string;
  readonly occupation?: string;
  readonly maritalStatus?: string;
  readonly emergencyContactName?: string;
  readonly emergencyContactNumber?: string;
  readonly relation?: string;
  readonly hasPrivacyConsent: boolean;
  readonly hasServiceConsent: boolean;
  readonly hasMedicalConsent: boolean;
  readonly bloodGroup?: string;
  readonly allergies?: string;
  readonly medicalConditions?: string;
  readonly medicalHistory?: string;
  readonly insuranceProvider?: string;
  readonly insuranceNumber?: string;
  readonly createdAt?: Date;                 // ⚠️ MUST SERIALIZE
  readonly updatedAt?: Date;                 // ⚠️ MUST SERIALIZE
  readonly profileImage?: string;
  readonly colorCode?: string;
  readonly lastVisitDate?: Date;             // ⚠️ MUST SERIALIZE
  readonly assignedAt?: Date | null;         // ⚠️ MUST SERIALIZE
  readonly visitCount?: number;
}
```

**Serialization verdict:** ⚠️ Requires Date-to-ISO-string conversion for 6 Date fields.

### ConsultationResponseDto

```typescript
interface ConsultationResponseDto {
  readonly id: number;
  readonly appointmentId: number;
  readonly doctorId: string;
  readonly userId?: string;
  readonly state: ConsultationState; // enum → string
  readonly startedAt?: Date;         // ⚠️ MUST SERIALIZE
  readonly completedAt?: Date;       // ⚠️ MUST SERIALIZE
  readonly durationMinutes?: number;
  readonly notes?: {
    readonly fullText: string;
    readonly structured?: {
      readonly chiefComplaint?: string;
      readonly examination?: string;
      readonly assessment?: string;
      readonly plan?: string;
    };
  };
  readonly outcomeType?: ConsultationOutcomeType; // enum
  readonly patientDecision?: PatientDecision; // enum
  readonly followUp?: {
    readonly date?: Date;           // ⚠️ MUST SERIALIZE
    readonly type?: string;
    readonly notes?: string;
  };
}
```

**Serialization verdict:** ⚠️ Requires Date-to-ISO-string conversion for 3 Date fields.

### VitalsData

```typescript
interface VitalsData {
  readonly bodyTemperature: number | null;
  readonly systolic: number | null;
  readonly diastolic: number | null;
  readonly heartRate: string | null;
  readonly respiratoryRate: number | null;
  readonly oxygenSaturation: number | null;
  readonly weight: number | null;
  readonly height: number | null;
  readonly recordedAt: string;     // ✅ Already string (ISO)
  readonly recordedBy: string | null;
}
```

**Serialization verdict:** ✅ Fully JSON-serializable. `recordedAt` is already ISO string.

### StructuredNotes

```typescript
interface StructuredNotes {
  readonly subjective?: string;
  readonly objective?: string;
  readonly assessment?: string;
  readonly plan?: string;
  readonly [key: string]: string | undefined;
}
```

**Serialization verdict:** ✅ Fully JSON-serializable. Plain object with string values.

### BillingSummary

```typescript
interface BillingSummary {
  readonly billItems: BillItem[];
  readonly totalAmount: number;
  readonly discount: number;
  readonly status?: string;
}

interface BillItem {
  readonly id?: number;
  readonly serviceId?: number;
  readonly inventoryItemId?: number;
  readonly serviceName: string;
  readonly quantity: number;
  readonly unitCost: number;
  readonly totalCost: number;
  readonly inventory: boolean;
}
```

**Serialization verdict:** ✅ Fully JSON-serializable. No Dates, no functions.

---

## 3. Incompatible Fields Summary

| Object | Field | Current Type | Issue | Solution |
|--------|-------|-------------|-------|----------|
| `AppointmentResponseDto` | `appointmentDate` | `Date` | Date object | Convert to ISO string |
| `AppointmentResponseDto` | `reviewedAt` | `Date` | Date object | Convert to ISO string |
| `AppointmentResponseDto` | `createdAt` | `Date` | Date object | Convert to ISO string |
| `AppointmentResponseDto` | `updatedAt` | `Date` | Date object | Convert to ISO string |
| `AppointmentResponseDto` | `checkedInAt` | `Date` | Date object | Convert to ISO string |
| `AppointmentResponseDto` | `consultationStartedAt` | `Date` | Date object | Convert to ISO string |
| `AppointmentResponseDto` | `consultationEndedAt` | `Date` | Date object | Convert to ISO string |
| `AppointmentResponseDto` | `patient.dateOfBirth` | `Date` | Date object in nested patient | Convert to ISO string |
| `PatientResponseDto` | `dateOfBirth` | `Date` | Date object | Convert to ISO string |
| `PatientResponseDto` | `createdAt` | `Date` | Date object | Convert to ISO string |
| `PatientResponseDto` | `updatedAt` | `Date` | Date object | Convert to ISO string |
| `PatientResponseDto` | `lastVisitDate` | `Date` | Date object | Convert to ISO string |
| `PatientResponseDto` | `assignedAt` | `Date | null` | Date object or null | Convert to ISO string or null |
| `ConsultationResponseDto` | `startedAt` | `Date` | Date object | Convert to ISO string |
| `ConsultationResponseDto` | `completedAt` | `Date` | Date object | Convert to ISO string |
| `ConsultationResponseDto` | `followUp.date` | `Date` | Date object in nested followUp | Convert to ISO string |

**Total incompatible fields: 16 Date fields across 3 objects.**

---

## 4. Serialization Strategy

### Server-Side Serialization

```typescript
// BELOW IS PSEUDOCODE FOR ILLUSTRATION ONLY

function serializeSessionData(session: SessionData): SerializedSessionData {
  return {
    appointment: serializeAppointment(session.appointment),
    patient: serializePatient(session.patient),
    vitals: session.vitals ? serializeVitals(session.vitals) : null,
    consultation: session.consultation ? serializeConsultation(session.consultation) : null,
    doctorId: session.doctorId,
    workflowState: session.workflowState, // enum → string
    isDirty: session.isDirty,
    draftAvailable: session.draftAvailable,
    notes: session.notes,
    outcomeType: session.outcomeType, // enum → string
    patientDecision: session.patientDecision, // enum → string
  };
}

function serializeAppointment(appointment: AppointmentResponseDto): SerializedAppointment {
  return {
    ...appointment,
    appointmentDate: appointment.appointmentDate.toISOString(),
    reviewedAt: appointment.reviewedAt?.toISOString(),
    createdAt: appointment.createdAt?.toISOString(),
    updatedAt: appointment.updatedAt?.toISOString(),
    checkedInAt: appointment.checkedInAt?.toISOString(),
    consultationStartedAt: appointment.consultationStartedAt?.toISOString(),
    consultationEndedAt: appointment.consultationEndedAt?.toISOString(),
    patient: appointment.patient ? {
      ...appointment.patient,
      dateOfBirth: appointment.patient.dateOfBirth instanceof Date 
        ? appointment.patient.dateOfBirth.toISOString() 
        : appointment.patient.dateOfBirth,
    } : undefined,
  };
}

function serializePatient(patient: PatientResponseDto): SerializedPatient {
  return {
    ...patient,
    dateOfBirth: patient.dateOfBirth.toISOString(),
    createdAt: patient.createdAt?.toISOString(),
    updatedAt: patient.updatedAt?.toISOString(),
    lastVisitDate: patient.lastVisitDate?.toISOString(),
    assignedAt: patient.assignedAt?.toISOString() ?? null,
  };
}

function serializeConsultation(consultation: ConsultationResponseDto): SerializedConsultation {
  return {
    ...consultation,
    startedAt: consultation.startedAt?.toISOString(),
    completedAt: consultation.completedAt?.toISOString(),
    followUp: consultation.followUp ? {
      ...consultation.followUp,
      date: consultation.followUp.date?.toISOString(),
    } : undefined,
  };
}
```

### Client-Side Deserialization

```typescript
// BELOW IS PSEUDOCODE FOR ILLUSTRATION ONLY

function deserializeAppointment(data: SerializedAppointment): AppointmentResponseDto {
  return {
    ...data,
    appointmentDate: new Date(data.appointmentDate),
    reviewedAt: data.reviewedAt ? new Date(data.reviewedAt) : undefined,
    createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
    updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined,
    checkedInAt: data.checkedInAt ? new Date(data.checkedInAt) : undefined,
    consultationStartedAt: data.consultationStartedAt ? new Date(data.consultationStartedAt) : undefined,
    consultationEndedAt: data.consultationEndedAt ? new Date(data.consultationEndedAt) : undefined,
    patient: data.patient ? {
      ...data.patient,
      dateOfBirth: new Date(data.patient.dateOfBirth),
    } : undefined,
  };
}
```

**Note:** Enums are NOT deserialized back to enum values. They remain strings. This is safe because:
1. Enums are used for comparison (`===`) and display
2. String enum values are stable
3. No enum-specific methods are used

---

## 5. Non-Serializable Types Audit

| Type | Found in Boundary? | Issue | Solution |
|------|-------------------|-------|----------|
| `Date` | ✅ Yes (16 fields) | Not JSON-serializable | Convert to ISO string |
| `Map` | ❌ No | — | — |
| `Set` | ❌ No | — | — |
| `Class instance` | ❌ No | — | — |
| `Function` | ❌ No (in data) | — | — |
| `Error object` | ❌ No (in data) | — | — |
| `undefined` | ✅ Yes (optional fields) | JSON.stringify omits undefined | Use `null` explicitly in DTOs |
| `BigInt` | ❌ No | — | — |
| `Symbol` | ❌ No | — | — |

### undefined vs null

In TypeScript, `undefined` values are omitted by `JSON.stringify`. This is fine for optional fields but can cause hydration mismatches if the client expects `null`.

**Current DTOs already use `null` for optional fields in most cases. No change needed.**

---

## 6. Version Conflicts and Data Integrity

### Version Source

Clinical data versions come from:
1. `Consultation.updatedAt` timestamp
2. `Consultation.version` string (ETag or version number)
3. `Draft.version` string

### Version Serialization

All versions are strings or timestamps in current implementation. No version object transformation needed.

### Data Integrity Guarantees

| Concern | Current | Post-Migration |
|---------|---------|----------------|
| Appointment data | From API response | From API response (same) |
| Patient data | From API response | From API response (same) |
| Consultation data | From API response | From API response (same) |
| Vitals data | From API response | From API response (same) |
| Notes | From DraftService or Consultation API | From DraftService or Consultation API (same) |
| Workflow state | Computed by WorkflowEngine | Computed by WorkflowEngine (same) |

**Data integrity is preserved. No data is transformed or lost during serialization.**

---

## 7. Payload Size Analysis

### Full Session Serialization (Estimated)

| Data Category | Fields | Estimated Size |
|---------------|--------|----------------|
| Appointment | 20 fields + nested patient (3 fields) + nested doctor (2 fields) | ~1.2 KB |
| Patient | 30 fields | ~1.5 KB |
| Vitals | 10 fields | ~300 bytes |
| Consultation | 15 fields + nested notes | ~800 bytes |
| Notes (SOAP) | 4 fields | ~2 KB (worst case: long text) |
| Workflow/state | 5 fields | ~100 bytes |
| **Total** | **~85 fields** | **~6 KB typical, ~10 KB worst case** |

### Worst-Case Payload

If notes contain very long text (e.g., 5000 chars per field):
- Notes: 4 × 5000 = 20,000 bytes
- Total: ~26 KB

**This is still acceptable for RSC payloads.** Next.js handles payloads up to several hundred KB.

---

## 8. Serialization Edge Cases

### Timezone Handling

**Problem:** `Date.toISOString()` returns UTC. Client `new Date(isoString)` interprets as UTC. This is correct behavior.

**Edge case:** If any Date field stores a date-only value (no time), `toISOString()` will append `T00:00:00.000Z`. This is semantically equivalent.

**Mitigation:** Use ISO 8601 strings consistently. No timezone conversion needed.

### Date Round-Trip Precision

**Problem:** `Date` has millisecond precision. `toISOString()` preserves it. Round-trip is lossless.

**Verdict:** ✅ No precision loss.

### Null vs Undefined

**Problem:** JSON.stringify converts `undefined` to omitted property. Some providers may check `=== undefined`.

**Current code:** Most providers check `=== null` or falsy checks. No explicit `=== undefined` checks found in boundary objects.

**Mitigation:** Serialize `undefined` as `null` explicitly in serializer.

### Nested Object Circular References

**Problem:** If any DTO contains a circular reference, JSON.stringify throws.

**Audit:** No circular references found in AppointmentResponseDto, PatientResponseDto, ConsultationResponseDto, VitalsData, StructuredNotes, BillingSummary.

**Verdict:** ✅ No circular references.

### Enums

**Problem:** TypeScript enums can have numeric or string values. Both are serializable.

**Current:** All enums used in boundary objects are string enums.

```typescript
enum ConsultationWorkflowState {
  IDLE = 'IDLE',
  READY = 'READY',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
}
```

**Verdict:** ✅ String enums serialize to their string values.

---

## 9. Serialization Contract

### Server-Side Contract

```typescript
// BELOW IS PSEUDOCODE FOR ILLUSTRATION ONLY

interface SerializationContract {
  // All Dates become ISO 8601 strings
  dateFields: string[]; // field names that are Dates
  
  // All enums become their string values
  enumFields: string[]; // field names that are enums
  
  // null is preserved, undefined becomes null
  nullableFields: string[]; // fields that can be null
  
  // Plain objects are recursively serialized
  nestedObjects: string[]; // fields containing nested DTOs
  
  // Arrays of plain objects are recursively serialized
  arrayFields: string[]; // fields containing arrays of DTOs
}
```

### Client-Side Contract

```typescript
// BELOW IS PSEUDOCODE FOR ILLUSTRATION ONLY

interface DeserializationContract {
  // ISO strings become Date objects
  dateFields: string[];
  
  // String enum values stay as strings (no enum reconstruction)
  enumFields: string[];
  
  // null stays null
  nullableFields: string[];
  
  // Plain objects stay as plain objects
  nestedObjects: string[];
  
  // Arrays stay as arrays
  arrayFields: string[];
}
```

---

## 10. Conclusion

**All boundary objects are JSON-serializable.**

**16 Date fields require explicit ISO string conversion.**

**No Maps, Sets, Classes, Functions, Error objects, or circular references cross the boundary.**

**The serialization contract is simple:**
1. Dates → ISO strings
2. Enums → strings
3. null → null
4. undefined → null
5. Plain objects → plain objects
6. Arrays → arrays

**Implementation risk: LOW.**
