# Auto-Save Issue: Root Cause Analysis

## Problem Statement
When doctor types in the Examination or Assessment tab's rich text editor, the auto-save feature triggers repeatedly and creates an "impossible user experience" (typing lags, stutters, or feels blocked).

## Root Cause: Duplicate onChange Notifications

### The Issue Chain

**1. Multiple onChange Fire Per Keystroke**

When a doctor types in the `ExaminationTab`'s RichTextEditor:

```tsx
// Inside ExaminationTab - the detailed findings editor
<RichTextEditor
  content={section?.content || ''}
  onChange={(value) => {
    // Handler 1: Direct callback execution
    setSections(updatedSections);
    setExamination(html);      // ← Updates state
    onChange(html);             // ← Calls parent FIRST TIME
  }}
/>
```

Then ExaminationTab ALSO has:
```tsx
// Handler 2: useEffect watching the state it just updated
useEffect(() => {
  if (examination !== initialValue && examination !== lastSentRef.current) {
    lastSentRef.current = examination;
    onChange(examination);      // ← Calls parent SECOND TIME
  }
}, [examination]);  // ← This effect fires when setExamination() above runs
```

**Result**: `onChange` is called **twice per keystroke** - once directly from the handler, once from the effect.

---

**2. Three Different RichTextEditors, Three onChange Paths**

The ExaminationTab actually has **multiple RichTextEditor instances**:

```tsx
// Editor 1: Detailed section findings
<RichTextEditor onChange={(value) => {
  setSections(...);
  setExamination(html);
  onChange(html);  // Path A
}} />

// Editor 2: Additional notes (the "Additional Notes" section)
<RichTextEditor 
  content={examination}
  onChange={handleChange}  // Path B - different onChange
/>

// Where handleChange is:
const handleChange = (value: string) => {
  setExamination(value);     // ← Triggers useEffect again
  onChange(value);           // Path B calls onChange
};
```

When typing in Editor 2:
- RichTextEditor fires onChange → deferred via `setTimeout(() => onChange(html), 0)`
- `handleChange` calls `setExamination(value)`
- This triggers the useEffect → which calls `onChange` again
- **Two calls per keystroke** in this editor too

---

**3. State Updates Bubble Up and Trigger Auto-Save Multiple Times**

PathMap of a single keystroke:

```
Keystroke in RichTextEditor
  ↓
RichTextEditor.onUpdate → setTimeout(() => onChange(html), 0)
  ↓
ExaminationTab.onChange handler runs (Handler 1)
  - setSections()
  - setExamination(html)
  - onChange(html)              ← Call #1 to parent
  ↓
setExamination() state update triggers useEffect
  ↓
ExaminationTab.useEffect runs (Handler 2)
  - onChange(examination)        ← Call #2 to parent
  ↓
Parent receives onChange twice
  ↓
ConsultationWorkspaceOptimized.updateNotes() called twice
  ↓
state.notes updated twice
  ↓
Auto-save effect dependency [state.notes] changes twice
  ↓
Debounce timeout reset TWICE per keystroke
```

---

## Why This Creates an "Impossible UX"

### Scenario 1: Continuous Typing
```
Doctor types: "A" → saves trigger reset
Doctor types: "b" → saves trigger reset
Doctor types: "c" → saves trigger reset
...
Result: Debounce timer NEVER expires during continuous typing
```

The auto-save timeout is constantly reset because `state.notes` changes twice per keystroke. The doctor might:
- See "Saving..." indicator flickering in and out
- Wonder if their changes are being saved
- Experience perceived lag if the save payloads are large

### Scenario 2: RichTextEditor Re-render on External Content Updates
The RichTextEditor has:
```tsx
useEffect(() => {
  if (editor && content !== editor.getHTML()) {
    editor.commands.setContent(content);  // External content update
  }
}, [content, editor]);
```

If the parent's `content` prop updates (from another editor, or from server sync), this can cause an infinite loop:
1. Parent updates content prop
2. RichTextEditor pulls in new content
3. But the actual HTML might be slightly different after parsing
4. This triggers another onChange
5. Parent updates state
6. Content prop updates again
7. Loop...

---

## Why It Happens: Design Issue

The problem is **mixing two change-notification patterns**:

1. **Direct callback**: `onChange` called immediately in the handler
2. **Effect-based notification**: `useEffect` watches state and reports changes

This dual approach was likely intended to:
- Notify parent immediately for responsive UI
- Also use effects to ensure no changes are missed

But it actually causes **redundant notifications** because:
- The handler calls `onChange` directly
- Then updates `state` which triggers `useEffect`
- The `useEffect` also calls `onChange`
- **Parent can't tell if it's one change or two**

---

## Impact on Auto-Save

The ConsultationContext's auto-save effect:

```tsx
useEffect(() => {
  if (!isActive || !state.workflow.isDirty) return;

  if (saveTimeoutRef.current) {
    clearTimeout(saveTimeoutRef.current);  // Clears old timeout
  }

  // Set new timeout for auto-save (3 seconds)
  saveTimeoutRef.current = setTimeout(() => {
    saveDraft();
  }, 3000);

  return () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
  };
}, [state.notes, isActive, state.workflow.isDirty, saveDraft]);
```

**The problem**: This effect has `state.notes` in its dependency array.

When `state.notes` changes twice per keystroke (due to duplicate onChange calls):
- The effect runs twice per keystroke
- Timeout is cleared and reset **twice**
- During continuous typing, the timeout is never allowed to expire
- Save is indefinitely delayed OR bursts of saves happen when typing stops

---

## Summary of Root Causes

| Level | Issue | Location |
|-------|-------|----------|
| **Component** | Duplicate onChange handlers | ExaminationTab has both direct callback AND useEffect |
| **State** | onChange called for single edit event | One keystroke → 2 onChange calls |
| **Parent Update** | state.notes updates twice per keystroke | ConsultationContext receives onChange twice |
| **Auto-Save** | Debounce resets on every update | Effect dependency on state.notes resets timer |
| **UX** | Impossible typing experience | Doctor perceives save interference during typing |

---

## Next Steps

The fix requires:
1. **Consolidate onChange pathways** - use ONE mechanism to notify parent, not two
2. **Debounce at the component level** - don't send raw onChange to parent, debounce first
3. **OR debounce at the state level** - use a debounced notes state for the auto-save effect
4. **Remove the useEffect watching examined state** - let the handler callback be the single source of truth
5. **Test continuous typing** - ensure auto-save doesn't flicker or reset during sustained input
