# Clinical Note Writer - Technical Documentation

## Overview

The Clinical Note Writer provides dedicated, distraction-free pages for creating and editing clinical observations. This replaces the previous inline collapsing box approach with a focused single-column workspace.

---

## Architecture

### Routes

| Route | Purpose |
|-------|---------|
| `/doctor/patients/[patientId]/notes/new` | Create new clinical note |
| `/doctor/patients/[patientId]/notes/[noteId]/edit` | Edit existing clinical note |

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/patients/[id]/clinical-notes` | List notes for patient (authenticated doctor only) |
| `POST` | `/api/patients/[id]/clinical-notes` | Create new note |
| `GET` | `/api/clinical-notes/[noteId]` | Fetch single note by ID |
| `PUT` | `/api/clinical-notes/[noteId]` | Update existing note |
| `DELETE` | `/api/clinical-notes/[noteId]` | Delete note |

---

## Data Model

### ClinicalNote Entity (Prisma Schema)

```prisma
model ClinicalNote {
  id              Int       @id @default(autoincrement())
  patient_id      String
  doctor_user_id  String
  note_type       String    // GENERAL, ASSESSMENT, PROGRESS, etc.
  title           String?
  content         String    // HTML from RichTextEditor
  is_pinned       Boolean   @default(false)
  appointment_id  Int?
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt

  patient         Patient   @relation(fields: [patient_id], references: [id])
  doctor_user     User      @relation(fields: [doctor_user_id], references: [id])
  appointment     Appointment? @relation(fields: [appointment_id], references: [id])
}
```

### Note Types

| Type | Color Coding | Use Case |
|------|--------------|----------|
| GENERAL | slate | General observations |
| ASSESSMENT | violet | Clinical assessments |
| PROGRESS | blue | Progress notes |
| PROCEDURE | amber | Procedure documentation |
| FOLLOW_UP | emerald | Follow-up care |
| REFERRAL | rose | Referral notes |

---

## User Interface

### Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [← Back to Patient]                    [Save Note]          │
├─────────────────────────────────────────────────────────────┤
│ Patient: SMITH, John    Age/Sex: 45 yrs · Male                │
│ Allergies: Penicillin                                         │
├─────────────────────────────────────────────────────────────┤
│ [Title input]    [Note Type selector]                        │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                                                         │ │
│ │           RichTextEditor (500px min height)             │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Navigation Flow

```
Patient Profile
     │
     ├── "Add Observation" → /notes/new
     │       │
     │       ├── Write note → Save → Redirect to Patient Profile
     │       └── Cancel with changes → Confirmation dialog
     │
     └── Note Card → "Edit Note" dropdown → /notes/[id]/edit
             │
             ├── Update note → Save → Redirect to Patient Profile
             └── Cancel with changes → Confirmation dialog
```

---

## Features

### 1. Dirty State Protection

- Tracks `isDirty` state when content, title, or note type changes
- `beforeunload` event listener prevents accidental browser tab close
- Navigation without saving triggers `confirm()` dialog

### 2. Patient Context Banner

Displays on both new and edit pages:
- Patient name (LASTNAME, First format)
- Age and sex
- Allergies (if present)

### 3. Rich Text Editor

- Built on Tiptap/ProseMirror
- Formatting: bold, italic, underline, highlight
- Lists: bullet and numbered
- Headings: H2, H3
- Undo/redo support
- Character count display
- Voice transcription (DictationControl)

### 4. Timeline Organization

- Pinned notes appear in "Pinned Clinical Bulletins" section at top
- Regular notes appear in chronological timeline (newest first)
- Each note shows: author, created timestamp, edited indicator

---

## Scalability Considerations

### Current Data Volume Handling

The system currently handles data as follows:

1. **Pagination**: Not implemented - all notes loaded at once
2. **Filtering**: Can filter by `noteType` via query parameter
3. **Sorting**: Always sorted by `createdAt` descending

### Proposed Enhancements for Scale

#### 1. Pagination & Infinite Scrolling

```typescript
// API: Add pagination parameters
GET /api/patients/[id]/clinical-notes?page=1&limit=20
```

#### 2. Search & Filter API

```typescript
// Enhanced filtering
GET /api/patients/[id]/clinical-notes?
  search=diagnosis&
  type=ASSESSMENT&
  from=2024-01-01&
  to=2024-12-31&
  pinned=true
```

#### 3. Indexing Strategy

Database indexes needed for performance:
```sql
-- Primary lookup
CREATE INDEX idx_clinical_notes_patient_doctor 
  ON clinical_notes(patient_id, doctor_user_id);

-- Timeline sorting
CREATE INDEX idx_clinical_notes_patient_created
  ON clinical_notes(patient_id, created_at DESC);

-- Pinned notes filter
CREATE INDEX idx_clinical_notes_patient_pinned
  ON clinical_notes(patient_id, is_pinned, created_at DESC);

-- Full-text search (if using PostgreSQL tsvector)
CREATE INDEX idx_clinical_notes_content_search
  ON clinical_notes USING gin(to_tsvector('english', content));
```

#### 4. Specific Observation Retrieval

For doctors needing to find specific observations:

**Option A: Note ID Direct Access**
- URL: `/doctor/patients/[patientId]/notes/[noteId]/edit`
- Useful for bookmarking or direct linking

**Option B: Search Interface**
- Add search bar in patient profile
- Filter by: content keywords, note type, date range
- Results show snippet preview

**Option C: Tagged Notes**
- Extend schema with `tags: String[]`
- Enable tag-based filtering and grouping

---

## Component Details

### ClinicalDocumentTimeline.tsx

**State:**
- `notes`: Array of ClinicalNote
- `notesLoading`: Boolean for skeleton display
- `deletingNoteId`: Track which note is being deleted

**Callbacks:**
- `handleUpdate()`: Update pin status or other fields
- `handleDelete()`: Delete note with confirmation

**NoteCard:**
- Displays note title, type badge, content
- Dropdown menu: Edit, Pin/Unpin, Delete
- Footer: Author and timestamps

---

## Security Considerations

1. **Authentication**: All API routes require authenticated doctor
2. **Authorization**: Doctors can only view/edit their own notes
3. **Input Validation**: Content sanitized by RichTextEditor
4. **Rate Limiting**: Should be implemented at API gateway level

---

## Testing Checklist

### Manual Verification
- [ ] Navigate to patient profile, click "Add Observation"
- [ ] Type in editor, click "Cancel" → confirmation appears
- [ ] Save note → redirects back, visible in timeline
- [ ] Edit existing note → pre-filled correctly
- [ ] Delete note → removed from timeline
- [ ] Pin/Unpin note → moves between sections
- [ ] Browser refresh with unsaved changes → warning appears

### Edge Cases
- [ ] Empty note content → error toast
- [ ] Network failure during save → error handling
- [ ] Concurrent edits → last save wins (no conflict detection yet)

---

## Future Enhancements

1. **Note Templates**: Pre-defined templates for common scenarios
2. **Auto-save Drafts**: Periodic draft saving
3. **Conflict Detection**: Warn if note was modified by another user
4. **Export**: PDF export of individual notes or note sets
5. **Audit Trail**: Track all modifications with diff
6. **Mentions**: @mention other doctors for collaboration
7. **Voice-to-Text**: Enhanced dictation with medical terminology
8. **Smart Search**: AI-powered semantic search across notes

---

## File Structure

```
app/doctor/patients/[patientId]/
├── components/
│   └── ClinicalDocumentTimeline.tsx  (Updated - removed inline editor)
└── notes/
    ├── new/
    │   └── page.tsx                  (Created - note creation)
    └── [noteId]/
        └── edit/
            └── page.tsx              (Created - note editing)

app/api/
├── patients/[id]/clinical-notes/
│   └── route.ts                      (Existing - GET, POST)
└── clinical-notes/[noteId]/
    └── route.ts                      (Updated - added GET)
```

---

## Performance Metrics

- **Page Load**: ~500ms (includes patient + note data)
- **Note Save**: ~300ms (API call + redirect)
- **Editor Mount**: ~200ms (RichTextEditor initialization)