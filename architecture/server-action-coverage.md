# Server Action Coverage

## Executive Summary

This document audits every user interaction in the consultation feature against its Server Action implementation.

**Date:** 2026-07-26  
**Status:** 4 PRODUCTION, 10 STUBBED, 3 VIOLATIONS

---

## 1. Production Server Actions

| Interaction | Server Action | Factory Method | SessionService Method | Status |
|-------------|--------------|----------------|----------------------|--------|
| initializeSession | `initializeSession` ✅ | `createConsultationSession` | `initializeSession()` | ✅ PRODUCTION |
| startSession | `startSession` ✅ | `startConsultationSession` | `startSession()` | ✅ PRODUCTION |
| resumeSession | `resumeSession` ✅ | `resumeConsultationSession` | `resumeSession()` | ✅ PRODUCTION |
| completeSession | `completeSession` ✅ | `completeConsultationSession` | `completeSession()` | ✅ PRODUCTION |

---

## 2. Stubbed Server Actions

| Interaction | Server Action | Factory Method | Status |
|-------------|--------------|----------------|--------|
| cancelCompletion | `cancelCompletion` | ❌ Missing factory method | ⚠️ STUBBED |
| switchToPatient | `switchToPatient` | ❌ Missing factory method | ⚠️ STUBBED |
| advanceQueue | `advanceQueue` | ❌ Missing factory method | ⚠️ STUBBED |
| sendHeartbeat | `sendHeartbeat` | ❌ Missing factory method | ⚠️ STUBBED |
| pauseSession | `pauseSession` | ❌ Missing factory method | ⚠️ STUBBED |
| resumePausedSession | `resumePausedSession` | ❌ Missing factory method | ⚠️ STUBBED |
| saveDraft | `saveDraft` | ❌ Missing factory method | ⚠️ STUBBED |
| saveCompletedNotes | `saveCompletedNotes` | ❌ Missing factory method | ⚠️ STUBBED |
| refreshPatient | `refreshPatient` | ❌ Missing factory method | ⚠️ STUBBED |
| refreshVitals | `refreshVitals` | ❌ Missing factory method | ⚠️ STUBBED |

---

## 3. Direct API Violations (No Server Action)

| Interaction | Current Implementation | File | Line | Status |
|-------------|------------------------|------|------|--------|
| Complete consultation | `doctorApi.completeConsultation(dto)` | `CompleteConsultationDialog.tsx` | 133 | 🚨 VIOLATION |
| Complete consultation (steps) | `doctorApi.completeConsultation(dto)` | `complete/CompleteConsultationDialog.tsx` | 145 | 🚨 VIOLATION |
| Start consultation (queue) | `doctorApi.startConsultation({...})` | `ConsultationQueuePanel.tsx` | 114 | 🚨 VIOLATION |

---

## 4. Acceptable Local Interactions (No Server Action Needed)

| Interaction | Implementation | Status |
|-------------|----------------|--------|
| Update notes | `DocumentationProvider.dispatch()` | ✅ LOCAL |
| Set outcome | `DocumentationProvider.dispatch()` | ✅ LOCAL |
| Set patient decision | `DocumentationProvider.dispatch()` | ✅ LOCAL |
| Adjust billing items | `BillingProvider.setState()` | ✅ LOCAL |
| Open/close dialogs | `DialogProvider.setState()` | ✅ LOCAL |
| Timer display | `TimerContextProvider` | ✅ LOCAL |
| Queue display | `QueueContextProvider` + React Query | ✅ LOCAL |

---

## 5. Certification

| Check | Status |
|-------|--------|
| All production Server Actions verified | ✅ 4/4 |
| All stubbed Server Actions identified | ✅ 10/10 |
| All direct API violations identified | ✅ 3/3 |
| All local interactions verified | ✅ 6 |

**Verdict: COVERAGE AUDIT COMPLETE**

3 critical interactions bypass Server Actions entirely.
