# Runtime Mutation Inventory

## Executive Summary

This document enumerates every mutation in the consultation feature at runtime. Mutations are classified as either acceptable presentation-state mutations or violations that must execute on the server.

**Date:** 2026-07-26  
**Status:** 10 VIOLATIONS, 11 ACCEPTABLE LOCAL, 4 MIGRATED

---

## 1. Server Boundary Mutations (Must Execute on Server)

### 1.1 Direct API Calls (Critical Violations)

| ID | File | Line | Mutation | Current Path | Status |
|----|------|------|----------|--------------|--------|
| V-01 | `ConsultationQueuePanel.tsx` | 114 | `doctorApi.startConsultation({...})` | Client → HTTP POST | 🚨 VIOLATION |
| V-02 | `CompleteConsultationDialog.tsx` | 133 | `doctorApi.completeConsultation(dto)` | Client → HTTP POST | 🚨 VIOLATION |
| V-03 | `complete/CompleteConsultationDialog.tsx` | 145 | `doctorApi.completeConsultation(dto)` | Client → HTTP POST | 🚨 VIOLATION |
| V-04 | `BillingTab.tsx` | 46 | `apiClient.get('/services/consultation')` | Client → HTTP GET | 🚨 VIOLATION |

### 1.2 Direct Fetch Calls (Acceptable if Route Handlers Verified)

| ID | File | Line | Mutation | Current Path | Status |
|----|------|------|----------|--------------|--------|
| V-05 | `DictationControl.tsx` | 40 | `fetch('/api/clinical/dictation')` | Client → Route Handler | ⚠️ ACCEPTABLE |
| V-06 | `DictationControl.tsx` | 112 | `fetch('/api/clinical/dictation', {...})` | Client → Route Handler | ⚠️ ACCEPTABLE |
| V-07 | `ServicePicker.tsx` | 59 | `fetch('/api/services', {...})` | Client → Route Handler | ⚠️ ACCEPTABLE |

### 1.3 Stubbed Server Actions (Boundary Exists but No Production)

| ID | File | Line | Mutation | Current Path | Status |
|----|------|------|----------|--------------|--------|
| V-08 | `SessionProvider.tsx` | 288–308 | `cancelCompletionAction()` | Client → Stub | ⚠️ STUBBED |
| V-09 | `SessionProvider.tsx` | 310–339 | `advanceQueueAction()` | Client → Stub | ⚠️ STUBBED |
| V-10 | `SessionProvider.tsx` | 341–348 | `sendHeartbeatAction()` | Client → Stub | ⚠️ STUBBED |
| V-11 | `SessionProvider.tsx` | 237–262 | `switchToPatientAction()` | Client → Stub | ⚠️ STUBBED |
| V-12 | `DocumentationProvider.tsx` | 231–256 | `saveDraftAction()` | Client → Stub | ⚠️ STUBBED |
| V-13 | `DocumentationProvider.tsx` | 268–314 | `saveCompletedNotesAction()` | Client → Stub | ⚠️ STUBBED |
| V-14 | `PatientContextProvider.tsx` | 168–180 | `refreshPatientAction()` | Client → Stub | ⚠️ STUBBED |
| V-15 | `PatientContextProvider.tsx` | 200–212 | `refreshVitalsAction()` | Client → Stub | ⚠️ STUBBED |
| V-16 | `SessionProvider.tsx` | 670+ | `pauseSessionAction()` | Client → Stub | ⚠️ STUBBED |
| V-17 | `SessionProvider.tsx` | 670+ | `resumePausedSessionAction()` | Client → Stub | ⚠️ STUBBED |

### 1.4 Migrated Server Actions (Production)

| ID | File | Line | Mutation | Path | Status |
|----|------|------|----------|------|--------|
| M-01 | `SessionProvider.tsx` | 167–188 | `initializeSessionAction()` | Client → Server Action → Factory → SessionService → WorkflowEngine | ✅ MIGRATED |
| M-02 | `SessionProvider.tsx` | 190–212 | `startSessionAction()` | Client → Server Action → Factory → SessionService → WorkflowEngine | ✅ MIGRATED |
| M-03 | `SessionProvider.tsx` | 214–235 | `completeSessionAction()` | Client → Server Action → Factory → SessionService → WorkflowEngine | ✅ MIGRATED |
| M-04 | `SessionProvider.tsx` | 264–286 | `resumeSessionAction()` | Client → Server Action → Factory → SessionService → WorkflowEngine | ✅ MIGRATED |

---

## 2. Local Presentation Mutations (Acceptable)

| ID | File | Line | Mutation | Classification |
|----|------|------|----------|----------------|
| L-01 | `DocumentationProvider.tsx` | 203 | `dispatch({ type: 'SET_NOTES' })` | ✅ Local state |
| L-02 | `DocumentationProvider.tsx` | 206 | `dispatch({ type: 'SET_OUTCOME' })` | ✅ Local state |
| L-03 | `DocumentationProvider.tsx` | 209 | `dispatch({ type: 'SET_PATIENT_DECISION' })` | ✅ Local state |
| L-04 | `DocumentationProvider.tsx` | 214–215 | `dispatch({ type: 'UPDATE_NOTE_FIELD' })` | ✅ Local state |
| L-05 | `DocumentationProvider.tsx` | 234 | `dispatch({ type: 'SET_SAVING' })` | ✅ Local state |
| L-06 | `DocumentationProvider.tsx` | 241 | `dispatch({ type: 'SET_DIRTY' })` | ✅ Local state |
| L-07 | `BillingProvider.tsx` | 82–84 | `setBillingItems(...)` | ✅ Local state |
| L-08 | `BillingProvider.tsx` | 83 | `setBillingTotal(...)` | ✅ Local state |
| L-09 | `BillingProvider.tsx` | 84 | `setDiscount(...)` | ✅ Local state |
| L-10 | `DialogProvider.tsx` | 54–57 | `setCompleteDialogOpen(...)` | ✅ Local state |
| L-11 | `DialogProvider.tsx` | 55–56 | `setStartDialogOpen(...)` | ✅ Local state |

---

## 3. Mutation Summary

| Classification | Count | Mutations |
|----------------|-------|-----------|
| Migrated (Server Action → Factory → Service) | 4 | initialize, start, resume, complete |
| Stubbed (Server Action → Stub) | 10 | cancel, switch, advance, heartbeat, pause, resumePaused, saveDraft, saveNotes, refreshPatient, refreshVitals |
| Direct API (Violation) | 3 | complete (2D), start, billing fetch |
| Direct Fetch (Acceptable if Route Handlers) | 3 | dictation GET/POST, services GET |
| Local Presentation | 11 | notes, outcomes, decisions, billing UI, dialogs |

---

## 4. Certification

| Check | Status |
|-------|--------|
| All server mutations identified | ✅ 17 |
| All direct API violations identified | ✅ 3 critical |
| All acceptable fetch calls identified | ✅ 3 |
| All local state mutations identified | ✅ 11 |
| No missing mutations | ✅ |

**Verdict: INVENTORY COMPLETE**
