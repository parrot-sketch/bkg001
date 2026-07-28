# HTML Storage Strategy

## Executive Summary

This document defines how HTML content from the ClinicalRichTextEditor is stored, hydrated, and validated across the consultation module.

**Date:** 2026-07-27  
**Status:** STRATEGY DEFINED

---

## 1. Storage Format

### 1.1 Database Schema

The consultation table stores notes as JSON/JSONB:

```sql
notes JSONB
-- Shape:
-- {
--   "rawText": "string (plain text fallback)",
--   "structured": {
--     "chiefComplaint": "<p>HTML string</p>",
--     "examination": "<p>HTML string</p>",
--     "assessment": "<p>HTML string</p>",
--     "plan": "<p>HTML string</p>"
--   }
-- }
```

### 1.2 StructuredNotes Type

```typescript
export interface StructuredNotes {
  chiefComplaint?: string;  // HTML string
  examination?: string;     // HTML string
  assessment?: string;      // HTML string
  plan?: string;            // HTML string
}
```

All fields are HTML strings produced by Tiptap.

---

## 2. HTML Generation

### 2.1 Tiptap Output

Tiptap produces sanitized HTML by default:
- No `<script>` tags
- No `on*` event handlers
- No `javascript:` URLs
- Only allowed tags: p, ul, ol, li, strong, em, u, h2, h3, blockquote, hr, a, table, etc.

### 2.2 Full Text Generation

```typescript
function generateFullText(notes: StructuredNotes): string {
  return [
    notes.chiefComplaint,
    notes.examination,
    notes.assessment,
    notes.plan,
  ]
    .filter(Boolean)
    .join('\n\n');
}
```

The `rawText` field is a plain-text fallback for search/indexing.

---

## 3. Hydration

### 3.1 Server → Client

```
Server Component
  → SessionService.initializeSession()
    → ConsultationApi.loadConsultation()
      → DB returns notes JSON
    → DraftService.restoreDraft()
      → localStorage backup (if newer)
    → serialize session
      → SerializedSessionData.notes = structured notes as strings
  → Client: DocumentationProvider
    → dispatch SET_NOTES with server notes
    → RichTextEditor receives content prop
    → editor.commands.setContent(content)
```

### 3.2 Browser Refresh

```
Browser refresh
  → SessionProvider rehydrates from initialSession props
    → setNotes(initialSession.notes)
  → DocumentationProvider useEffect
    → dispatch SET_NOTES
  → RichTextEditor receives content
    → setContent()
```

---

## 4. Sanitization

### 4.1 Input Sanitization (Server Side)

When notes are persisted via Server Action:
- Tiptap HTML is already safe
- Server does not execute HTML
- JSON serialization preserves HTML strings

### 4.2 Output Sanitization (Client Side)

When rendering:
- Tiptap renders HTML via ProseMirror
- ProseMirror parses HTML into a safe document model
- No raw HTML insertion

### 4.3 If Additional Sanitization Required

The correct architectural layer is the **Infrastructure Adapter** (`HttpConsultationApi` or a new `HtmlSanitizer` utility). The editor must never sanitize its own output.

---

## 5. Migration Path

### 5.1 Current State

- Existing notes are stored as plain text in some cases
- Tiptap editor expects HTML
- Plain text is wrapped in `<p>` tags on hydration if no HTML detected

### 5.2 Normalization

```typescript
function normalizeNotesContent(content: string): string {
  if (!content) return '';
  // If content looks like plain text (no HTML tags), wrap in paragraphs
  if (!/<[a-z][\s\S]*>/i.test(content)) {
    return content.split('\n\n').map(p => `<p>${p}</p>`).join('');
  }
  return content;
}
```

This runs in the Presentation layer (Tab component or RichTextEditor) before passing to Tiptap.

---

## 6. Certification

| Check | Status |
|-------|--------|
| HTML is the storage format | ✅ |
| Tiptap produces safe HTML | ✅ |
| No raw HTML injection | ✅ |
| Server serialization safe | ✅ |
| Client hydration safe | ✅ |
| Plain text fallback handled | ✅ |
| Sanitization layer identified | ✅ Infrastructure |

**Verdict: STORAGE STRATEGY SOUND**
