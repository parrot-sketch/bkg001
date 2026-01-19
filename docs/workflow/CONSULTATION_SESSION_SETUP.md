# Consultation Session UI - Setup Guide

**Last Updated:** January 2025

## Quick Start

### 1. Install Dependencies

```bash
npm install @tanstack/react-query lodash @types/lodash @radix-ui/react-tabs
```

### 2. Add React Query Provider

Update your root layout to include React Query provider:

```typescript
// app/layout.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <html lang="en">
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </body>
    </html>
  );
}
```

### 3. Verify API Routes

Ensure these API routes exist:
- `GET /api/consultations/:id`
- `PUT /api/consultations/:id/draft`
- `GET /api/patients/:patientId/consultations`

### 4. Test the Implementation

1. Navigate to `/doctor/consultations/[appointmentId]/session`
2. Start a consultation
3. Add notes in any tab
4. Verify auto-save triggers after 30 seconds
5. Complete the consultation

---

## Component Files Created

### Core Components
- `app/doctor/consultations/[appointmentId]/session/page.tsx` - Main page
- `components/consultation/ConsultationSessionHeader.tsx` - Header with timer and actions
- `components/consultation/PatientInfoSidebar.tsx` - Persistent patient context
- `components/consultation/ConsultationWorkspace.tsx` - Tab-based workspace
- `components/consultation/CompleteConsultationDialog.tsx` - Completion modal

### Tab Components
- `components/consultation/tabs/PatientGoalsTab.tsx`
- `components/consultation/tabs/ExaminationTab.tsx`
- `components/consultation/tabs/ProcedureDiscussionTab.tsx`
- `components/consultation/tabs/PhotosTab.tsx`
- `components/consultation/tabs/RecommendationsTab.tsx`
- `components/consultation/tabs/TreatmentPlanTab.tsx`

### Hooks
- `hooks/consultation/useConsultation.ts`
- `hooks/consultation/useSaveConsultationDraft.ts`
- `hooks/consultation/usePatientConsultationHistory.ts`

### API Client
- `lib/api/consultation.ts`

---

## Key Features Implemented

✅ **State Machine Fidelity** - UI reflects backend state (NOT_STARTED → IN_PROGRESS → COMPLETED)
✅ **Auto-Save** - Debounced every 30 seconds with localStorage backup
✅ **Draft Recovery** - Restores draft from localStorage on page reload
✅ **Version Safety** - Optimistic locking prevents overwriting newer versions
✅ **Medico-Legal Safety** - Validation, warnings, audit trail
✅ **Surgeon-Centered UX** - Minimal cognitive load, fast capture, persistent patient context
✅ **Network Resilience** - Retry logic, error handling, offline backup

---

## Architecture Decisions

### Why React Query?
- Automatic caching and background refetching
- Optimistic updates with rollback
- Request deduplication
- Built-in retry logic
- Perfect for clinical workstation (always fresh data)

### Why Debounced Auto-Save?
- Reduces server load (not every keystroke)
- 30 seconds balances responsiveness vs. efficiency
- localStorage backup ensures zero data loss
- Surgeon can focus on patient, not saving

### Why Tab-Based Workspace?
- Fast switching between consultation sections
- Organized information capture
- Minimal cognitive load
- Keyboard-friendly navigation

### Why Persistent Patient Sidebar?
- Always visible patient context
- Critical for aesthetic surgery (patient journey over time)
- Quick access to medical history, allergies, previous consultations
- No losing context when switching tabs

---

## UX Decisions Explained

### 1. Minimal Color Palette
**Decision:** Neutral colors, not consumer SaaS aesthetic
**Reason:** Clinical workstation should feel professional, not playful. Surgeons need to focus on patient, not UI.

### 2. No Heavy Animations
**Decision:** Instant tab switching, no transitions
**Reason:** Speed matters during live consultation. Animations add delay and cognitive load.

### 3. Subtle Auto-Save Indicator
**Decision:** Small dot with "Saving..." / "Saved" text
**Reason:** Reassuring but not intrusive. Surgeon shouldn't be distracted by save status.

### 4. Read-Only After Completion
**Decision:** Completed consultations cannot be edited
**Reason:** Medico-legal requirement. Completed consultations are final records.

### 5. Validation Before Completion
**Decision:** Required fields enforced in completion dialog
**Reason:** Medico-legal safety. Cannot complete without outcome and summary.

### 6. Version Conflict Handling
**Decision:** Refetch and show user-friendly error
**Reason:** Prevents data loss if multiple tabs open. Surgeon can refresh and continue.

---

## Testing Checklist

- [ ] Start consultation flow
- [ ] Add notes in each tab
- [ ] Verify auto-save triggers
- [ ] Verify localStorage backup
- [ ] Test draft recovery after reload
- [ ] Test completion flow
- [ ] Test read-only mode after completion
- [ ] Test version conflict scenario
- [ ] Test network failure handling
- [ ] Test state machine transitions

---

## Next Enhancements

1. **Photo Capture Integration**
   - Camera API integration
   - Photo upload to server
   - Photo gallery in Photos tab

2. **Structured Notes Aggregation**
   - Aggregate notes from all tabs
   - Save as structured format (chief complaint, examination, assessment, plan)
   - Auto-fill notes panel from tabs

3. **Voice Dictation** (Optional)
   - Web Speech API integration
   - Voice-to-text for notes
   - Hands-free during examination

4. **Consultation Templates**
   - Pre-built templates by procedure type
   - Quick note capture
   - Auto-populate common fields

5. **Real-Time Collaboration**
   - Show consultation status to frontdesk
   - Nurse can add notes during consultation
   - Multi-user support

---

## Summary

The Consultation Session UI is implemented as a production-grade clinical workstation with:
- Complete component structure
- React Query integration
- Auto-save with draft recovery
- State machine fidelity
- Medico-legal safety
- Surgeon-centered UX

Ready for integration after installing dependencies and adding React Query provider.
