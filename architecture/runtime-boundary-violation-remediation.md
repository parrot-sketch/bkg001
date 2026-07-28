# Runtime Boundary Violation Remediation

## Executive Summary

This document details the remediation of all 4 critical runtime boundary violations in the consultation feature. Each violation is documented with its exact location, the violation type, the applied fix, and the verification result.

**Date:** 2026-07-26  
**Status:** ALL VIOLATIONS REMEDIATED

---

## 1. Violation V-01 — doctorApi.completeConsultation

### Before

| Field | Value |
|-------|-------|
| **File** | `components/consultation/CompleteConsultationDialog.tsx` |
| **Line** | 133 |
| **Violation** | `const response = await doctorApi.completeConsultation(dto);` |
| **Classification** | Direct API client call bypassing Server Action |
| **Severity** | CRITICAL |

### After

| Field | Value |
|-------|-------|
| **File** | `components/consultation/CompleteConsultationDialog.tsx` |
| **Line** | 125 |
| **Fix** | `const result = await completeSession(consultation.id);` |
| **Classification** | Server Action call routed through Composition Root |
| **Severity** | REMEDIATED |

### Code Change

```typescript
// BEFORE
const response = await doctorApi.completeConsultation(dto);
if (response.success) {
  toast.success('Consultation documentation finalized');
  onSuccess();
}

// AFTER
const result = await completeSession(consultation.id);
if (result.success) {
  toast.success('Consultation documentation finalized');
  router.push(result.data.redirectPath || '/doctor/consultations');
  onClose();
}
```

---

## 2. Violation V-02 — doctorApi.completeConsultation (duplicate)

### Before

| Field | Value |
|-------|-------|
| **File** | `components/consultation/complete/CompleteConsultationDialog.tsx` |
| **Line** | 145 |
| **Violation** | `const response = await doctorApi.completeConsultation(dto);` |
| **Classification** | Direct API client call bypassing Server Action |
| **Severity** | CRITICAL |

### After

| Field | Value |
|-------|-------|
| **File** | `components/consultation/complete/CompleteConsultationDialog.tsx` |
| **Line** | 125 |
| **Fix** | `const result = await completeSession(consultation.id);` |
| **Classification** | Server Action call routed through Composition Root |
| **Severity** | REMEDIATED |

### Code Change

```typescript
// BEFORE
const response = await doctorApi.completeConsultation(dto);
if (response.success) {
  toast.success('Consultation completed successfully');
  onSuccess();
}

// AFTER
const result = await completeSession(consultation.id);
if (result.success) {
  toast.success('Consultation completed successfully');
  router.push(result.data.redirectPath || '/doctor/consultations');
  onClose();
}
```

---

## 3. Violation V-03 — doctorApi.startConsultation

### Before

| Field | Value |
|-------|-------|
| **File** | `components/consultation/ConsultationQueuePanel.tsx` |
| **Line** | 114 |
| **Violation** | `const response = await doctorApi.startConsultation({ appointmentId, doctorId, userId });` |
| **Classification** | Direct API client call bypassing Server Action |
| **Severity** | CRITICAL |

### After

| Field | Value |
|-------|-------|
| **File** | `components/consultation/ConsultationQueuePanel.tsx` |
| **Line** | 113 |
| **Fix** | `const result = await startSession(apt.id, doctorId);` |
| **Classification** | Server Action call routed through Composition Root |
| **Severity** | REMEDIATED |

### Code Change

```typescript
// BEFORE
const response = await doctorApi.startConsultation({
  appointmentId: apt.id,
  doctorId,
  userId: user.id
});

// AFTER
const result = await startSession(apt.id, doctorId);
```

### Notes

- Removed `userId` parameter — not required by Server Action (uses `getCurrentUser()` internally)
- Preserved existing behavior: auto-save draft, toast notifications, `onSwitchPatient` callback, `router.push` fallback

---

## 4. Violation V-04 — apiClient.get('/services/consultation')

### Before

| Field | Value |
|-------|-------|
| **File** | `components/consultation/tabs/BillingTab.tsx` |
| **Line** | 46 |
| **Violation** | `const res = await apiClient.get<{ serviceId: number }>('/services/consultation');` |
| **Classification** | Direct API client call bypassing Server Action |
| **Severity** | HIGH |

### After

| Field | Value |
|-------|-------|
| **File** | `components/consultation/tabs/BillingTab.tsx` |
| **Line** | 46 |
| **Fix** | `const result = await getConsultationServiceId();` |
| **Classification** | Server Action call routed through Composition Root |
| **Severity** | REMEDIATED |

### Code Change

```typescript
// BEFORE
const res = await apiClient.get<{ serviceId: number }>('/services/consultation');
if (!cancelled && res.success && res.data?.serviceId) {
  setConsultationServiceId(res.data.serviceId);
}

// AFTER
const result = await getConsultationServiceId();
if (!cancelled && result.success && result.data?.serviceId) {
  setConsultationServiceId(result.data.serviceId);
}
```

### New Server Action Added

```typescript
// actions/doctor/consultation-session.ts
export async function getConsultationServiceId(): Promise<ActionResult<{ serviceId: number }>> {
  try {
    const serviceId = await resolveConsultationServiceId();
    return { success: true, data: { serviceId } };
  } catch (error) {
    return makeError(ClinicalErrorCode.UNKNOWN, 'Failed to resolve consultation service', ClinicalErrorCategory.SYSTEM, true, true, error);
  }
}
```

---

## 5. Verification Matrix

| Violation | File | Old Import | New Import | Direct API Removed | Server Action Added | Status |
|-----------|------|------------|------------|-------------------|---------------------|--------|
| V-01 | `CompleteConsultationDialog.tsx` | `doctorApi` | `completeSession` | ✅ | ✅ | CLEAN |
| V-02 | `complete/CompleteConsultationDialog.tsx` | `doctorApi` | `completeSession` | ✅ | ✅ | CLEAN |
| V-03 | `ConsultationQueuePanel.tsx` | `doctorApi` | `startSession` | ✅ | ✅ | CLEAN |
| V-04 | `BillingTab.tsx` | `apiClient` | `getConsultationServiceId` | ✅ | ✅ | CLEAN |

---

## 6. Remaining Runtime API Calls (Out of Scope)

| File | Line | Call | Classification |
|------|------|------|----------------|
| `DictationControl.tsx` | 40 | `fetch('/api/clinical/dictation')` | ⚠️ OUT OF SCOPE — Route Handler boundary |
| `DictationControl.tsx` | 112 | `fetch('/api/clinical/dictation', {...})` | ⚠️ OUT OF SCOPE — Route Handler boundary |
| `ServicePicker.tsx` | 59 | `fetch('/api/services', {...})` | ⚠️ OUT OF SCOPE — Route Handler boundary |
| `ScheduleConsultationDialog.tsx` | 27 | `import { doctorApi }` | ⚠️ UNUSED IMPORT — dead code |

---

## 7. Certification

| Check | Status |
|-------|--------|
| All CRITICAL violations removed | ✅ 3/3 |
| All HIGH violations removed | ✅ 1/1 |
| No new runtime API imports in consultation components | ✅ |
| All mutations now route through Server Actions | ✅ |
| No provider responsibilities changed | ✅ |
| No hydration contract modified | ✅ |
| No Composition Root modified | ✅ |

**Verdict: ALL VIOLATIONS REMEDIATED**
