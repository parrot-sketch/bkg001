# Rich Text Editor Architecture

## Executive Summary

This document defines the architecture for the ClinicalRichTextEditor component. The editor is a pure Presentation component that renders HTML, captures edits, and emits HTML. It owns zero application state.

**Date:** 2026-07-27  
**Status:** DESIGN COMPLETE

---

## 1. Component Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                    ClinicalRichTextEditor                        │
│                                                                  │
│  Responsibilities:                                               │
│  • Render HTML content                                           │
│  • Capture user edits                                            │
│  • Emit HTML via onChange(html)                                  │
│  • Render toolbar with clinical formatting commands             │
│  • Manage selection, focus, blur                                 │
│  • Support keyboard shortcuts                                   │
│  • Support readOnly mode                                         │
│  • Support loading state                                         │
│                                                                  │
│  Must NOT:                                                       │
│  • Call SessionService                                           │
│  • Call DraftService                                             │
│  • Call doctorApi / apiClient                                    │
│  • Call WorkflowCoordinator                                      │
│  • Call WorkflowEngine                                           │
│  • Import Application, Domain, Infrastructure runtime           │
│  • Own persistence                                               │
│  • Own business rules                                           │
│  • Own dirty tracking                                            │
│  • Own auto-save                                                 │
│  • Import from '@/application'                                   │
│  • Import from '@/domain' (except pure enums)                    │
│  • Import from '@/infrastructure'                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Controlled Component API

```typescript
interface ClinicalRichTextEditorProps {
  /** HTML content to display */
  content: string;
  
  /** Called when content changes (debounced by caller or internally) */
  onChange: (html: string) => void;
  
  /** Placeholder text when empty */
  placeholder?: string;
  
  /** Read-only mode — disables toolbar and editing */
  readOnly?: boolean;
  
  /** Auto-focus on mount */
  autoFocus?: boolean;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Editor minimum height */
  minHeight?: string;
  
  /** Internal debounce for onChange emission (default: 0 — caller debounces) */
  changeDebounceMs?: number;
  
  /** Accessible label */
  ariaLabel?: string;
  
  /** Disabled state */
  disabled?: boolean;
}
```

---

## 3. State Ownership Model

| State | Owner | Location |
|-------|-------|----------|
| Notes content | DocumentationProvider | `state.notes[field]` |
| isDirty | DocumentationProvider | `state.isDirty` |
| isSaving | DocumentationProvider | `state.isSaving` |
| autoSaveStatus | DocumentationProvider | `state.autoSaveStatus` |
| lastSavedAt | DocumentationProvider | `state.lastSavedAt` |
| Editor instance | ClinicalRichTextEditor | Internal Tiptap editor |
| Pending change | ClinicalRichTextEditor | Internal ref |
| Toolbar state | ClinicalRichTextEditor | Derived from editor |

---

## 4. Integration Points

### 4.1 DocumentationProvider → Editor

```typescript
<ClinicalRichTextEditor
  content={notes.chiefComplaint || ''}
  onChange={(html) => updateNotes('chiefComplaint', html)}
  placeholder="Patient complaints, symptoms..."
  readOnly={isReadOnly}
  minHeight="400px"
/>
```

### 4.2 Editor → DocumentationProvider

```
User types
  → Editor emits onChange(html)
    → DocumentationProvider.updateNotes(field, html)
      → dispatch UPDATE_NOTE_FIELD
        → state.notes[field] = html
        → state.isDirty = true
```

---

## 5. Certification

| Check | Status |
|-------|--------|
| Editor owns zero application state | ✅ |
| Editor makes zero server calls | ✅ |
| Editor imports zero Application/Domain/Infrastructure | ✅ |
| Editor receives all data via props | ✅ |
| Editor emits all changes via callbacks | ✅ |
| DocumentationProvider remains sole notes owner | ✅ |
| Auto-save unchanged | ✅ |
| DraftService unchanged | ✅ |
| Server Actions unchanged | ✅ |

**Verdict: ARCHITECTURE SOUND**
