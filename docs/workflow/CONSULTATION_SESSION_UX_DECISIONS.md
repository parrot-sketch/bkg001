# Consultation Session UI - UX Decisions & Architecture

**Last Updated:** January 2025

## Overview

This document explains the key UX decisions and architectural choices made in implementing the Consultation Session UI for an aesthetic surgery EHR. Every decision prioritizes surgeon efficiency, medico-legal safety, and clinical realism.

---

## Core UX Principles

### 1. Feels Like a Real Clinical Workstation

**What We Did:**
- Neutral color palette (not consumer SaaS)
- Information-dense layout (maximum data, minimum space)
- Professional typography (monospace for notes)
- Minimal borders and shadows
- No fancy animations or transitions

**What We Avoided:**
- Bright colors and gradients
- Card-heavy layouts
- Chat-like interfaces
- Consumer dashboard aesthetics

**Why:** Surgeons need to focus on the patient, not the UI. The interface should feel like a professional medical tool, not a consumer app.

---

### 2. Zero Cognitive Overload

**What We Did:**
- Persistent patient context (always visible sidebar)
- Clear visual hierarchy (header → workspace → actions)
- Tab-based organization (one thing at a time)
- Subtle auto-save indicator (reassuring but not distracting)
- Keyboard-friendly navigation

**What We Avoided:**
- Modal overload (dialogs only when necessary)
- Complex nested navigation
- Overwhelming information density
- Cluttered action buttons

**Why:** During a live consultation, the surgeon's cognitive load should be on the patient, not the interface. Every UI element must earn its place.

---

### 3. Always Shows Patient Context

**What We Did:**
- Patient info sidebar always visible (sticky, left panel)
- Patient name in header
- Medical history, allergies, previous consultations visible
- Quick links to patient resources

**What We Avoided:**
- Hiding patient info behind modals
- Requiring navigation to see patient context
- Losing patient context when switching tabs

**Why:** In aesthetic surgery, understanding the patient journey over time is critical. Previous consultations, photos, and decisions inform current consultation.

---

### 4. Zero Risk of Data Loss

**What We Did:**
- Auto-save every 30 seconds (debounced)
- localStorage backup on every save
- Draft recovery on page reload
- Version safety (optimistic locking)
- Network error handling with retry

**What We Avoided:**
- Manual save only
- No backup mechanism
- Losing data on network failure
- No recovery from interruptions

**Why:** Medico-legally, consultation notes are critical. Data loss is unacceptable. Multiple layers of protection ensure zero data loss.

---

### 5. Fast and Minimal Interaction Cost

**What We Did:**
- Instant tab switching (no animations)
- Keyboard-friendly inputs
- Quick action buttons in header
- Debounced auto-save (doesn't block typing)
- Optimistic updates (immediate UI feedback)

**What We Avoided:**
- Slow animations
- Complex multi-step workflows
- Blocking operations
- Slow save operations

**Why:** During a live consultation, speed matters. Every click, every keystroke should feel instant. Surgeon shouldn't wait for the UI.

---

## Architectural Decisions

### State Management: React Query Only

**Decision:** Use React Query for all server state, useState for local UI state.

**Why:**
- React Query provides automatic caching, background refetching, optimistic updates
- Perfect for clinical workstation (always fresh data)
- No need for Redux (adds complexity without benefit)
- Built-in retry logic and error handling

**Implementation:**
```typescript
// Server state (React Query)
const { consultation } = useConsultation(appointmentId);

// Local UI state (useState)
const [activeTab, setActiveTab] = useState('goals');
const [localNotes, setLocalNotes] = useState('');
```

---

### Auto-Save Strategy: Debounced + localStorage Backup

**Decision:** Debounce auto-save to 30 seconds, backup to localStorage on every save.

**Why:**
- 30 seconds balances responsiveness vs. server load
- localStorage backup ensures zero data loss even if network fails
- Debouncing prevents excessive server requests
- Surgeon can focus on patient, not saving

**Implementation:**
```typescript
const debouncedSave = useMemo(
  () => debounce(async (notes: string) => {
    // Save to server
    await saveDraftMutation.mutateAsync({ ... });
    
    // Backup to localStorage
    localStorage.setItem(`consultation-draft-${appointmentId}`, ...);
  }, 30000),
  [appointmentId, saveDraftMutation]
);
```

---

### State Machine Fidelity: UI Reflects Backend

**Decision:** UI derives state from backend, never invents its own rules.

**Why:**
- Backend is source of truth for state machine
- Prevents frontend/backend state mismatches
- Ensures medico-legal compliance
- Single source of truth for business rules

**Implementation:**
```typescript
// Derived state (computed from server state)
const isConsultationActive = consultation?.state === ConsultationState.IN_PROGRESS;
const canSaveDraft = isConsultationActive;
const canComplete = isConsultationActive;

// UI reflects backend state
{isNotStarted && <StartConsultationButton />}
{isActive && <ConsultationWorkspace />}
{isCompleted && <ReadOnlyView />}
```

---

### Version Safety: Optimistic Locking

**Decision:** Use version tokens (updatedAt timestamp) for optimistic locking.

**Why:**
- Prevents overwriting newer versions (multiple tabs scenario)
- Medico-legally critical (can't lose consultation notes)
- User-friendly error handling (refetch and continue)

**Implementation:**
```typescript
// Save with version token
await saveDraftMutation.mutateAsync({
  appointmentId,
  doctorId,
  notes: { rawText: notes },
  versionToken: consultation.updatedAt.toISOString(), // Version token
});

// Backend validates version
if (dto.versionToken !== currentUpdatedAt) {
  throw new DomainException('Consultation was updated by another session');
}
```

---

### Layout: 3-Column Grid

**Decision:** Left sidebar (patient info), middle workspace (tabs), optional right panel (notes).

**Why:**
- Patient context always visible (left)
- Main workspace gets maximum space (middle)
- Notes panel can be collapsed (right)
- Familiar clinical workstation layout

**Implementation:**
```typescript
<div className="flex-1 flex overflow-hidden">
  {/* Left: Patient Info Sidebar (sticky) */}
  <PatientInfoSidebar patient={patient} />
  
  {/* Middle: Consultation Workspace */}
  <ConsultationWorkspace consultation={consultation} />
  
  {/* Right: Notes Panel (optional, collapsible) */}
  {/* Future enhancement */}
</div>
```

---

## Component Design Patterns

### 1. Header: Information-Dense, Action-Focused

**Design:**
- Patient name (left)
- Timer (elapsed time)
- Auto-save indicator (center, subtle)
- Quick actions (right, compact buttons)

**Why:**
- All critical info visible at a glance
- Actions accessible but not overwhelming
- Subtle auto-save doesn't distract

---

### 2. Patient Sidebar: Persistent Context

**Design:**
- Patient profile card (photo, name, age, file number)
- Medical info card (allergies prominent, conditions, history)
- Previous consultations (last 3, compact)
- Quick links (profile, case plans, photos)

**Why:**
- Always visible patient context
- Critical info (allergies) prominently displayed
- Quick access to patient resources
- No losing context when switching tabs

---

### 3. Workspace: Tab-Based Organization

**Design:**
- 6 tabs: Goals, Examination, Procedure, Photos, Recommendations, Treatment Plan
- Instant tab switching (no animations)
- Each tab has focused content area
- Keyboard-friendly navigation

**Why:**
- Organized information capture
- Fast switching between sections
- One thing at a time (reduces cognitive load)
- Familiar pattern (surgeons understand tabs)

---

### 4. Auto-Save Indicator: Subtle but Reassuring

**Design:**
- Small dot (blue = saving, green = saved, red = error)
- Text: "Saving...", "Saved", "Save failed"
- Positioned in header (center)
- Fades after 2 seconds (saved state)

**Why:**
- Reassuring (surgeon knows data is safe)
- Not intrusive (doesn't distract from patient)
- Clear status (saving vs. saved vs. error)
- Professional appearance

---

### 5. Complete Dialog: Medico-Legal Safety

**Design:**
- Warning banner (amber, prominent)
- Required fields clearly marked (*)
- Validation before submission
- Clear "cannot be undone" messaging

**Why:**
- Medico-legally critical (completed consultations are final)
- Prevents accidental completion
- Ensures all required data captured
- Professional, serious tone

---

## Error Handling Strategy

### Network Errors
- **Retry Logic:** 3 attempts, exponential backoff
- **User Feedback:** "Save failed" indicator
- **Fallback:** localStorage backup
- **Recovery:** Auto-retry on next save

### Version Conflicts
- **Detection:** 409 Conflict status code
- **User Feedback:** "Consultation was updated. Please refresh."
- **Recovery:** Refetch latest consultation, restore form state
- **Prevention:** Version tokens prevent conflicts

### State Machine Violations
- **Detection:** Backend validation
- **User Feedback:** Clear error messages
- **Prevention:** Disabled buttons for illegal actions
- **Recovery:** Refresh to get latest state

---

## Performance Optimizations

### 1. Debounced Auto-Save
- Reduces server load (not every keystroke)
- 30 seconds balances responsiveness vs. efficiency
- Doesn't block typing

### 2. Optimistic Updates
- Immediate UI feedback (no waiting for server)
- Rollback on error
- Surgeon sees changes instantly

### 3. Polling Only When Active
- Polls every 30s only if consultation is IN_PROGRESS
- Stops polling when completed
- Reduces unnecessary requests

### 4. Minimal Re-renders
- React Query handles caching
- Components only re-render when data changes
- No unnecessary re-renders

---

## Accessibility Considerations

### Keyboard Navigation
- All inputs keyboard accessible
- Tab navigation between fields
- Enter to submit forms
- Escape to close dialogs

### Screen Reader Support
- Semantic HTML (labels, headings)
- ARIA labels where needed
- Clear error messages
- Status announcements (auto-save status)

### Visual Accessibility
- High contrast text
- Clear focus indicators
- Readable font sizes
- Color not the only indicator

---

## Mobile/Tablet Considerations

### Current Implementation
- Desktop-first (clinical workstation)
- Responsive layout (works on tablet)
- Touch-friendly buttons (adequate size)

### Future Enhancements
- Tablet-optimized layout
- Touch gestures for photo capture
- Mobile consultation view (simplified)

---

## Summary

The Consultation Session UI is designed as a **professional clinical workstation** with:

1. **Surgeon-Centered UX** - Minimal cognitive load, fast capture, persistent patient context
2. **Medico-Legal Safety** - Validation, warnings, audit trail, version safety
3. **Zero Data Loss** - Auto-save, localStorage backup, draft recovery
4. **State Machine Fidelity** - UI reflects backend truth, no invented rules
5. **Network Resilience** - Retry logic, error handling, offline backup

Every design decision prioritizes surgeon efficiency and clinical safety over consumer aesthetics.
