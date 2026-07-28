# Final Runtime Violations

## Executive Summary

This document catalogs every remaining runtime violation in the consultation feature, ranked by architectural impact and implementation effort.

**Date:** 2026-07-26  
**Status:** 6 VIOLATIONS — 3 CRITICAL, 1 HIGH, 2 MEDIUM

---

## 1. Violation Catalog

### V-01: doctorApi.completeConsultation in CompleteConsultationDialog.tsx

| Field | Value |
|-------|-------|
| **Severity** | CRITICAL |
| **File** | `components/consultation/CompleteConsultationDialog.tsx` |
| **Line** | 133 |
| **Why it violates** | Bypasses Server Action boundary. Executes complete consultation business logic and workflow transition directly in client code via HTTP API call. |
| **Current path** | `onClick → doctorApi.completeConsultation(dto) → HTTP POST → Route Handler` |
| **Should be** | `onClick → completeSession Server Action → Factory → SessionService → WorkflowCoordinator → WorkflowEngine` |
| **Minimum correction** | Replace `doctorApi.completeConsultation(dto)` with `await completeSession(consultationId)` |
| **LOC touched** | ~15 |
| **Rollback risk** | HIGH — active code path |

### V-02: doctorApi.completeConsultation in complete/CompleteConsultationDialog.tsx

| Field | Value |
|-------|-------|
| **Severity** | CRITICAL |
| **File** | `components/consultation/complete/CompleteConsultationDialog.tsx` |
| **Line** | 145 |
| **Why it violates** | Duplicate implementation of complete consultation. Same violation as V-01 but in the step-based dialog variant. |
| **Current path** | `onClick → doctorApi.completeConsultation(dto) → HTTP POST → Route Handler` |
| **Should be** | `onClick → completeSession Server Action → ...` |
| **Minimum correction** | Replace `doctorApi.completeConsultation(dto)` with `await completeSession(consultationId)` |
| **LOC touched** | ~15 |
| **Rollback risk** | HIGH — active code path |

### V-03: doctorApi.startConsultation in ConsultationQueuePanel.tsx

| Field | Value |
|-------|-------|
| **Severity** | CRITICAL |
| **File** | `components/consultation/ConsultationQueuePanel.tsx` |
| **Line** | 114 |
| **Why it violates** | Bypasses Server Action boundary for start consultation. Executes business logic directly in client code. Also includes auto-save draft logic before the API call, mixing presentation and business orchestration. |
| **Current path** | `onClick → onSaveDraft() → doctorApi.startConsultation({appointmentId, doctorId, userId}) → HTTP POST` |
| **Should be** | `onClick → startSession Server Action → Factory → SessionService → WorkflowCoordinator → WorkflowEngine` |
| **Minimum correction** | Replace `doctorApi.startConsultation(...)` with `await startSession(appointmentId)` |
| **LOC touched** | ~20 |
| **Rollback risk** | HIGH — active code path |

### V-04: apiClient.get in BillingTab.tsx

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **File** | `components/consultation/tabs/BillingTab.tsx` |
| **Line** | 46 |
| **Why it violates** | Direct API client fetch in client component. Bypasses Server Action for data retrieval. |
| **Current path** | `useEffect → apiClient.get('/services/consultation') → HTTP GET` |
| **Should be** | Server Action or remove if data is available from session context |
| **Minimum correction** | Replace with `useQuery` calling a Server Action, or pass `consultationServiceId` as prop from server |
| **LOC touched** | ~10 |
| **Rollback risk** | MEDIUM — non-blocking fetch |

### V-05: fetch in DictationControl.tsx (GET)

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **File** | `components/consultation/DictationControl.tsx` |
| **Line** | 40 |
| **Why it violates** | Direct `fetch` to `/api/clinical/dictation` for availability check. This is acceptable if the Route Handler is the intended server boundary, but it bypasses the Server Action pattern used elsewhere. |
| **Current path** | `useEffect → fetch('/api/clinical/dictation') → HTTP GET` |
| **Should be** | Acceptable if Route Handler is verified as server boundary |
| **Minimum correction** | None if Route Handler is verified; otherwise wrap in Server Action |
| **LOC touched** | 0 |
| **Rollback risk** | LOW |

### V-06: fetch in DictationControl.tsx (POST)

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **File** | `components/consultation/DictationControl.tsx` |
| **Line** | 112 |
| **Why it violates** | Direct `fetch` to `/api/clinical/dictation` for transcription POST. Same concern as V-05. |
| **Current path** | `handleTranscription → fetch('/api/clinical/dictation', {method: 'POST', body: FormData})` |
| **Should be** | Acceptable if Route Handler is verified as server boundary |
| **Minimum correction** | None if Route Handler is verified; otherwise wrap in Server Action |
| **LOC touched** | 0 |
| **Rollback risk** | LOW |

---

## 2. Violation Ranking

### By Architectural Impact

| Rank | Violation | Impact |
|------|-----------|--------|
| 1 | V-01 — completeConsultation | CRITICAL |
| 2 | V-03 — startConsultation | CRITICAL |
| 3 | V-02 — completeConsultation (duplicate) | CRITICAL |
| 4 | V-04 — apiClient.get billing | HIGH |
| 5 | V-05 — fetch dictation GET | MEDIUM |
| 6 | V-06 — fetch dictation POST | MEDIUM |

### By Implementation Effort

| Rank | Violation | LOC |
|------|-----------|-----|
| 1 | V-04 — apiClient.get billing | 10 |
| 2 | V-01 — completeConsultation | 15 |
| 3 | V-02 — completeConsultation (duplicate) | 15 |
| 4 | V-03 — startConsultation | 20 |
| 5 | V-05 — fetch dictation GET | 0 |
| 6 | V-06 — fetch dictation POST | 0 |

---

## 3. Certification

| Check | Status |
|-------|--------|
| All critical violations identified | ✅ 3 |
| All high violations identified | ✅ 1 |
| All medium violations identified | ✅ 2 |
| All lines of code documented | ✅ |
| All rollback risks assessed | ✅ |

**Verdict: 6 VIOLATIONS CATALOGED — 3 CRITICAL MUST FIX FIRST**
