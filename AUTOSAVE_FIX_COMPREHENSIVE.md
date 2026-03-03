# Auto-Save Issue Fix - All Tabs

## Problem Summary

The consultation session had an autosave issue across multiple tabs (especially the Examination tab at `/doctor/consultations/[id]/session?tab=exam`).

**Root Cause**: Duplicate/redundant `onChange` notifications per keystroke caused the debounce timer in the auto-save effect to reset multiple times, preventing the save from ever triggering during continuous typing.

## Technical Issue Analysis

### The Cascade:

1. **RichTextEditor Design**: The RichTextEditor component uses a `setTimeout(..., 0)` to defer the `onChange` call:
   ```tsx
   onUpdate: ({ editor }) => {
     const html = editor.getHTML();
     // Defer onChange to next tick
     setTimeout(() => onChange(html), 0);
   }
   ```

2. **Property Update Loop**: When `RichTextEditor` receives a content prop change (from parent state updates), it has a `useEffect` that updates the editor:
   ```tsx
   useEffect(() => {
     if (editor && content !== editor.getHTML()) {
       editor.commands.setContent(content);  // This triggers onUpdate!
     }
   }, [content, editor]);
   ```

3. **ExaminationTab Complexity**: The ExaminationTab has TWO RichTextEditor instances:
   - Section editors (Face, Body, Skin, General) - each updates local `sections` state
   - Additional Notes editor - updates root `examination` state

4. **Double-Update Per Keystroke**:
   - User types in section editor
   - Section editor's `onChange` → calls `handleContentChange(html)` 
   - `handleContentChange` updates `examination` state (and calls parent's `onChange`)
   - `examination` state change → Additional Notes editor's `content` prop changes
   - Additional Notes editor's `useEffect` detects this → calls `setContent`
   - `setContent` triggers the editor's `onUpdate` → calls `onChange` AGAIN
   - **Result**: `onChange` called TWICE per keystroke

5. **Auto-Save Effect Breaks**:
   ```tsx
   useEffect(() => {
     if (!isActive || !state.workflow.isDirty) return;
     
     if (saveTimeoutRef.current) {
       clearTimeout(saveTimeoutRef.current);  // Clears timeout
     }
     
     saveTimeoutRef.current = setTimeout(() => {
       saveDraft();
     }, 3000);  // 3-second debounce
     
   }, [state.notes, ...]); // dependency on state.notes
   ```
   
   - `state.notes` changes twice per keystroke
   - Effect runs twice per keystroke
   - Timeout is cleared and reset twice
   - **During continuous typing**: Timeout never expires
   - **Result**: Autosave never triggers

## Solution Implemented

### 1. RichTextEditor Fix

Added an `isInternalUpdateRef` to track when content changes are from prop updates (not user edits):

```tsx
const isInternalUpdateRef = useRef(false);

const editor = useEditor({
  // ... config ...
  onUpdate: ({ editor }) => {
    // Skip onChange if this update came from internal content prop change
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }
    
    const html = editor.getHTML();
    setTimeout(() => onChange(html), 0);
  },
});

useEffect(() => {
  if (editor && content !== editor.getHTML()) {
    isInternalUpdateRef.current = true;  // Mark as internal update
    editor.commands.setContent(content);  // Now onUpdate will skip onChange
  }
}, [content, editor]);
```

**Impact**: Only user edits trigger `onChange`, not prop updates. This prevents the cascade of duplicate onChange calls.

### 2. ExaminationTab Additional Safety

Added defensive checks to prevent redundant onChange calls:

```tsx
// Track to prevent duplicate onChange
const lastSentValueRef = useRef<string>(initialValue);
const isInternalUpdateRef = useRef(false);

// External sync without triggering onChange
useEffect(() => {
  if (initialValue !== lastInitialValueRef.current) {
    lastInitialValueRef.current = initialValue;
    lastSentValueRef.current = initialValue;
    isInternalUpdateRef.current = true;
    setExamination(initialValue);
    setSections(new Map());
  }
}, [initialValue]);

// Single handler for all user edits
const handleContentChange = useCallback((value: string): void => {
  if (value === lastSentValueRef.current) {
    return;  // Don't call onChange if value hasn't actually changed
  }
  
  lastSentValueRef.current = value;
  isInternalUpdateRef.current = true;
  setExamination(value);
  onChange(value);
}, [onChange]);
```

**Impact**: 
- Only unique values trigger onChange
- Clear separation between external syncs and user edits
- No redundant parent notifications

## Files Modified

1. **[components/consultation/RichTextEditor.tsx](components/consultation/RichTextEditor.tsx)**
   - Added `isInternalUpdateRef` to track prop updates vs user edits
   - Modified `onUpdate` to skip `onChange` when ref is true
   - Modified content sync `useEffect` to set the ref before calling `setContent`

2. **[components/consultation/tabs/ExaminationTab.tsx](components/consultation/tabs/ExaminationTab.tsx)**
   - Added `lastInitialValueRef`, `lastSentValueRef`, `isInternalUpdateRef`
   - Enhanced external sync `useEffect` to use refs properly
   - Improved `handleContentChange` with duplicate-value check

## Affected Tabs

This fix applies to all tabs in the consultation session:

- **Examination Tab** (direct fix applied) - Most complex, had multiple editors
- **Patient Goals Tab** - Benefits from RichTextEditor fix (already had similar ref pattern)
- **Assessment/Recommendations Tab** - Benefits from RichTextEditor fix
- **Treatment Plan Tab** - Benefits from RichTextEditor fix
- **Billing Tab** - No rich text editors affected

## Testing the Fix

To verify the fix works:

1. Navigate to `/doctor/consultations/[id]/session?tab=exam`
2. Start typing in any of the examination section editors or Additional Notes
3. **Expected Behavior**:
   - "Saving..." indicator appears
   - Debounce timer resets only once per keystroke (not multiple times)
   - Auto-save occurs after 3 seconds of no typing
   - During continuous typing, save is deferred until typing stops

## Why This Works

The key insight is separating **internal state updates** (prop changes from parent/other editors) from **user edits** (actual typing):

- **Before**: Both types of updates triggered onChange, causing duplicates
- **After**: Only actual user edits trigger onChange, prop updates are skipped

This ensures:
1. Parent context receives `onChange` exactly once per typing event
2. `state.notes` updates exactly once per keystroke
3. Auto-save effect's debounce timer resets exactly once
4. Timer can properly expire during pauses in typing

## Related Documentation

- See [AUTO_SAVE_ROOT_CAUSE_ANALYSIS.md](AUTO_SAVE_ROOT_CAUSE_ANALYSIS.md) for detailed root cause analysis
- The auto-save mechanism uses 3-second debounce in [contexts/ConsultationContext.tsx](contexts/ConsultationContext.tsx) line 588

## Backwards Compatibility

✅ **Fully backwards compatible** - This fix only affects internal behavior of the RichTextEditor and ExaminationTab. The onChange interface remains unchanged.
