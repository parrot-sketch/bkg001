# Documentation Flow Analysis

## Executive Summary

This document maps the complete documentation flow in the consultation feature, from user input to persistence and hydration.

**Date:** 2026-07-27  
**Status:** AUDIT COMPLETE — FLOW VERIFIED

---

## 1. Current Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PRESENTATION LAYER                                                          │
│                                                                             │
│  ConsultationWorkspaceOptimized                                            │
│    ├── SubjectiveTab (RichTextEditor)                                       │
│    ├── ObjectiveTab (RichTextEditor)                                        │
│    ├── AssessmentTab (RichTextEditor)                                       │
│    └── PlanTab (RichTextEditor)                                             │
│                                                                             │
│  RichTextEditor (Tiptap-based)                                              │
│    ├── Toolbar (Bold, Italic, Underline, Highlight, Headings, Lists)       │
│    ├── EditorContent (ProseMirror)                                          │
│    ├── DictationControl (voice input)                                       │
│    └── CharacterCount                                                       │
│                                                                             │
│  DocumentationProvider (State Owner)                                        │
│    ├── notes: StructuredNotes                                               │
│    ├── outcomeType, patientDecision                                          │
│    ├── isDirty, isSaving, autoSaveStatus                                    │
│    ├── updateNotes(field, value)                                             │
│    ├── saveDraft() → Server Action                                          │
│    └── saveNotes() → Server Action                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ SERVER ACTIONS                                                              │
│                                                                             │
│  saveDraft(consultationId, doctorId, notes, outcomeType, patientDecision)  │
│  saveCompletedNotes(consultationId, doctorId, notes)                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ APPLICATION LAYER                                                           │
│                                                                             │
│  DraftService                                                                │
│    ├── saveDraft() → ConsultationApi.saveConsultationDraft()               │
│    ├── restoreDraft() → DraftStorage                                        │
│    └── discardDraft() → DraftStorage                                        │
│                                                                             │
│  SessionService (not used for individual note edits)                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ INFRASTRUCTURE LAYER                                                        │
│                                                                             │
│  HttpConsultationApi → consultationApi.saveDraft()                         │
│  LocalDraftStorage → localStorage                                           │
│  PrismaConsultationRepository → DB                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Sequence Diagrams

### 2.1 User Typing → Dirty Tracking → Auto-Save

```
User types in RichTextEditor
  → onUpdate: editor.getHTML()
    → RichTextEditor debounces (500ms)
      → onChange(html) [emitted to parent]
        → DocumentationProvider.updateNotes(field, html)
          → dispatch({ type: 'UPDATE_NOTE_FIELD', payload: { field, value } })
            → state.notes[field] = html
            → state.isDirty = true
        → Tab component: updateStructuredNotes(field, html)
          → generates fullText from structured notes
          → onNotesChange({ rawText, structured })
            → parent receives updated notes

Auto-save trigger (3s debounce):
  → DocumentationProvider useEffect [state.isDirty]
    → clearTimeout(saveTimeoutRef)
    → setTimeout(saveDraft, 3000)
      → saveDraft()
        → dispatch({ type: 'SET_SAVING', payload: true })
        → dispatch({ type: 'SET_AUTO_SAVE_STATUS', payload: 'saving' })
        → onSaveDraft(state.notes, state.outcomeType, state.patientDecision)
          → Server Action: saveDraft()
            → DraftService.saveDraft()
              → ConsultationApi.saveConsultationDraft()
                → HTTP POST /api/consultations/[id]/draft
                → PrismaConsultationRepository
              → DraftStorage.saveDraft() [localStorage backup]
            → return version
          → dispatch({ type: 'SET_DIRTY', payload: false })
          → dispatch({ type: 'SET_LAST_SAVED', payload: version })
          → dispatch({ type: 'SET_AUTO_SAVE_STATUS', payload: 'saved' })
          → setTimeout(() => dispatch({ type: 'SET_AUTO_SAVE_STATUS', payload: 'idle' }), 2000)
        → dispatch({ type: 'SET_SAVING', payload: false })
```

### 2.2 Notes Hydration (Page Load)

```
Page Load
  → Server Component: getConsultationPatientData(appointmentId)
    → DB: appointment + patient + vitals
  → Server Component: initializeSession(appointmentId)
    → Server Action
      → ConsultationSessionFactory.createConsultationSession()
        → SessionService.initializeSession()
          → ConsultationApi.loadConsultation()
          → DraftService.restoreDraft()
          → WorkflowCoordinator.execute(INITIALIZE_CONSULTATION)
        → serialize session data
      → return session + restoredDraft
  → Client: SessionProvider hydrates
    → setNotes(initialSession.notes)
    → setOutcome(initialSession.outcomeType)
    → setPatientDecision(initialSession.patientDecision)
  → DocumentationProvider useEffect [consultationId, notes]
    → dispatch({ type: 'SET_NOTES', payload: notes })
    → dispatch({ type: 'SET_OUTCOME', payload: outcomeType })
    → dispatch({ type: 'SET_PATIENT_DECISION', payload: patientDecision })
  → RichTextEditor receives content prop
    → editor.commands.setContent(content, { emitUpdate: false })
```

### 2.3 Previous Consultation Notes Loading

```
Doctor clicks "Previous Consultations"
  → getPatientConsultationHistory(patientId)
    → Server Action
      → DB: appointments + consultations + notes
    → return consultation list
  → Dropdown shows list
Doctor selects consultation
  → loadPreviousConsultationNotes(appointmentId)
    → Server Action
      → DB: consultation.notes (JSON)
      → parse notes → structured { chiefComplaint, examination, assessment, plan }
    → return notes
  → setSelectedPreviousConsultation(notes)
  → viewMode = 'previous'
  → RichTextEditor receives previous notes as content
  → readOnly = true
```

---

## 3. Entry/Exit Points

| Event | Entry Point | Exit Point | Owner |
|-------|-------------|------------|-------|
| User types | RichTextEditor onUpdate | onChange(html) | Editor |
| Notes change | onChange → DocumentationProvider | updateNotes(field, value) | DocumentationProvider |
| Auto-save trigger | useEffect [isDirty] | saveDraft() | DocumentationProvider |
| Draft persist | saveDraft() | Server Action → DraftService | Server |
| Draft restore | initializeSession | DraftService.restoreDraft() | Server |
| Notes hydration | page.tsx props | DocumentationProvider SET_NOTES | DocumentationProvider |
| Previous consult load | dropdown select | loadPreviousConsultationNotes() | Server Action |

---

## 4. Certification

| Check | Status |
|-------|--------|
| DocumentationProvider owns notes state | ✅ |
| RichTextEditor is presentation-only | ✅ |
| Auto-save debounced and deduplicated | ✅ |
| Server Actions handle persistence | ✅ |
| DraftService handles backup | ✅ |
| No client-side business logic in editor | ✅ |
| No direct API calls from editor | ✅ |

**Verdict: FLOW VERIFIED — READY FOR ENHANCEMENT**
