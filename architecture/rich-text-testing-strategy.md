# Rich Text Testing Strategy

## Executive Summary

This document defines the testing strategy for the ClinicalRichTextEditor and its integration with the documentation module.

**Date:** 2026-07-27  
**Status:** STRATEGY DEFINED

---

## 1. Unit Tests

### 1.1 ClinicalRichTextEditor

| Test | Description |
|------|-------------|
| Renders with content | HTML content displayed correctly |
| Renders empty with placeholder | Placeholder shown when content is empty |
| onChange emits HTML | Typing emits HTML string |
| readOnly mode | Toolbar hidden, editing disabled |
| disabled state | All interactions blocked |
| Toolbar buttons | Each button triggers correct Tiptap command |
| Keyboard shortcuts | Ctrl+B/I/U/Z/Y work correctly |
| Auto-focus | Editor focuses on mount when autoFocus=true |
| Cleanup on unmount | Timers cleared, editor destroyed |
| Content sync | External content update updates editor without emitting onChange |
| Cursor preservation | Cursor position maintained during external updates |

### 1.2 DocumentationProvider Integration

| Test | Description |
|------|-------------|
| updateNotes updates state | Notes state changes correctly |
| Dirty tracking | isDirty set to true on edit |
| Auto-save trigger | saveDraft called after 3s debounce |
| saveDraft success | isDirty false, autoSaveStatus 'saved' |
| saveDraft failure | autoSaveStatus 'error' |
| Hydration | SET_NOTES dispatched on consultationId change |
| Reset | RESET_NOTES clears all state |

---

## 2. Integration Tests

| Test | Description |
|------|-------------|
| Mount tab with notes | Editor shows existing notes |
| Edit note → auto-save | Note change triggers debounced save |
| Switch tabs → preserve | Notes preserved across tab switches |
| Read-only mode | Completed consultation shows read-only editor |
| Previous consultation | Loading previous notes works |
| Back to current | Restores current notes correctly |

---

## 3. E2E Tests

| Test | Description |
|------|-------------|
| Complete SOAP note | Fill all 4 sections, save, verify in DB |
| Browser refresh | Notes persist after refresh |
| Concurrent edit | Two tabs edited, last save wins |
| Large document | 5000+ characters, no lag |
| Mobile layout | Toolbar wraps, editor usable |

---

## 4. Test Coverage Targets

| Component | Target |
|-----------|--------|
| ClinicalRichTextEditor | 90% |
| DocumentationProvider | 95% |
| Integration | 80% |

---

## 5. Certification

| Check | Status |
|-------|--------|
| Unit tests defined | ✅ |
| Integration tests defined | ✅ |
| E2E tests defined | ✅ |
| Coverage targets set | ✅ |

**Verdict: TESTING STRATEGY COMPLETE**
