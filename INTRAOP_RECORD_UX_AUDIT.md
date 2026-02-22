# Intra-Operative Record UX Audit

**Date:** 2025-01-XX  
**Context:** Nurse documents intra-op record after pre-op ward checklist is complete  
**URL:** `/nurse/intra-op-cases/[caseId]/record`  
**Form Length:** 14 sections, ~200+ fields

---

## Executive Summary

The intra-op record is a **comprehensive, safety-critical clinical form** with excellent domain architecture but significant UX challenges for nurses during active surgery. The form is well-structured with proper validation, but the current implementation requires extensive scrolling, manual section navigation, and lacks real-time auto-save.

**Key Findings:**
- ✅ **Strong:** Domain logic, validation, state management
- ⚠️ **Needs Improvement:** Form length, navigation, auto-save, mobile UX
- 🔴 **Critical:** No auto-save, all sections collapsed by default, no quick-entry shortcuts

---

## 1. Current Implementation Analysis

### 1.1 Architecture Strengths

✅ **Domain-Driven Design**
- Clean separation: Domain → Application → API → UI
- Zod schemas for draft vs final validation
- Section completion heuristics
- Recovery gate compliance checks

✅ **State Management**
- React Query for server state
- Optimistic updates
- Proper cache invalidation
- Error handling with structured missing items

✅ **Clinical Safety**
- Count discrepancy warnings
- Critical section highlighting
- Finalization gates
- Audit trail

### 1.2 UX Pain Points

#### 🔴 **Critical Issues**

1. **No Auto-Save**
   - Nurse must manually click "Save Draft" button
   - Risk of data loss during long surgery
   - No visual indicator of unsaved changes (except bottom bar)
   - **Impact:** High — nurses may lose work during interruptions

2. **All Sections Collapsed by Default**
   - 14 sections in accordion, all closed initially
   - Nurse must expand each section to see/edit
   - No visual overview of what's complete vs incomplete
   - **Impact:** High — slows data entry, hard to see progress

3. **No Quick Entry Mode**
   - Every field requires full form interaction
   - No shortcuts for common values
   - No smart defaults from pre-op checklist
   - **Impact:** Medium — slows documentation during active surgery

4. **Long Scroll Distance**
   - 14 sections × ~200 fields = very long page
   - Bottom action bar is sticky but far from top
   - No section jump navigation
   - **Impact:** High — inefficient navigation during surgery

#### ⚠️ **Medium Priority Issues**

5. **Progress Tracking Limited**
   - Progress bar shows completion but not which sections
   - No "Next Incomplete Section" button
   - Section completion logic is basic (any field filled = complete)
   - **Impact:** Medium — nurses can't efficiently find what's missing

6. **Mobile/Tablet Unfriendly**
   - Form designed for desktop
   - Accordion sections may be cramped on tablet
   - Time inputs may be difficult on touch
   - **Impact:** Medium — many nurses use tablets in theater

7. **No Pre-Op Data Integration**
   - Pre-op checklist data not pre-populated
   - Nurse must re-enter allergies, ASA class, etc.
   - No visual reference to pre-op findings
   - **Impact:** Medium — duplicate data entry, potential inconsistencies

8. **Timeline Panel Separate**
   - Operative timeline is separate card, not integrated
   - Nurse must scroll up to see timeline
   - Timeline editing requires separate interaction
   - **Impact:** Low — functional but could be better integrated

9. **Dynamic Tables (Medications/Implants/Specimens)**
   - Tables are functional but basic
   - No bulk import from medication list
   - No inventory integration for implants
   - **Impact:** Low — works but could be more efficient

---

## 2. Comparison with Pre-Op Ward Checklist

### 2.1 Pre-Op Checklist Patterns (Reference)

**Pre-Op Checklist Strengths:**
- ✅ Structured skin prep enums
- ✅ SpO₂ added
- ✅ Urinalysis enum + custom
- ✅ Soft vitals warnings
- ✅ Branded print route
- ✅ FINAL lock
- ✅ Amendment pattern supported

**Pre-Op Checklist UX:**
- Similar accordion structure
- Similar section completion tracking
- Similar finalization flow

**Key Difference:**
- Pre-op is shorter (fewer sections)
- Pre-op is done before surgery (less time pressure)
- Intra-op is done DURING surgery (high time pressure, interruptions)

---

## 3. Detailed Section Analysis

### 3.1 Section-by-Section UX Review

| Section | Fields | UX Issues | Priority |
|---------|--------|-----------|----------|
| **1. Arrival & Entry** | 5 | Pre-populate from pre-op | Medium |
| **2. Safety Checks & IV** | 12 | Critical section — should be expanded by default | High |
| **3. Theatrical Timings** | 4 | Integrate with timeline panel | Medium |
| **4. Surgical Team** | 6 | Good import feature, but could auto-populate | Low |
| **5. Diagnoses & Operation** | 3 | Pre-populate from case plan | Medium |
| **6. Positioning & Alignment** | 8 | Many checkboxes — could use better grouping | Low |
| **7. Catheterization** | 4 | Simple, no issues | Low |
| **8. Skin Preparation** | 3 | Pre-populate from pre-op | Medium |
| **9. Equipment** | 15 | Complex nested structure — could use tabs | Medium |
| **10. Surgical Details** | 8 | Good checkbox groups | Low |
| **11. Instruments & Sharps Count** | Variable | **CRITICAL** — should be expanded, prominent | High |
| **12. Closure & Dressing** | 3 | Simple, no issues | Low |
| **13. Fluids & Transfusions** | 6 | Good warnings, but could auto-calculate totals | Low |
| **14. Medications/Implants/Specimens** | Variable | Tables work but could have bulk actions | Low |

### 3.2 Critical Sections Requiring Special Attention

**Safety Checks & IV (Section 2)**
- ⚠️ Should be expanded by default
- ⚠️ Should show pre-op checklist completion status
- ⚠️ Should highlight WHO checklist status

**Instruments & Sharps Count (Section 11)**
- 🔴 **MUST** be expanded by default
- 🔴 **MUST** have prominent count discrepancy warning
- 🔴 Should have quick "Count Correct" toggle at top
- 🔴 Should prevent finalization if incorrect

---

## 4. Recommended UX Enhancements

### 4.1 Immediate Improvements (High Impact, Low Effort)

#### 4.1.1 Auto-Save Implementation
```typescript
// Add debounced auto-save (save after 2s of inactivity)
useEffect(() => {
  if (!isDirty || isFinalized) return;
  
  const timer = setTimeout(() => {
    saveMutation.mutate(formData, { onSuccess: () => setIsDirty(false) });
  }, 2000);
  
  return () => clearTimeout(timer);
}, [formData, isDirty]);
```

**Benefits:**
- Prevents data loss
- Reduces cognitive load
- Nurse can focus on surgery

#### 4.1.2 Smart Section Expansion
```typescript
// Expand critical sections by default
const defaultExpanded = [
  'safety',      // Critical safety checks
  'counts',      // Critical counts
  'entry',       // First section
];
```

**Benefits:**
- Nurse sees critical sections immediately
- Reduces clicks
- Better visual hierarchy

#### 4.1.3 Pre-Populate from Pre-Op
```typescript
// In API route, fetch pre-op checklist and pre-populate
const preOpForm = await getPreOpForm(caseId);
if (preOpForm) {
  emptyData.entry.allergies = preOpForm.data.allergies || surgicalCase.patient.allergies;
  emptyData.entry.asaClass = preOpForm.data.asaClass;
  emptyData.safety.preOpChecklistCompleted = preOpForm.status === 'FINAL';
}
```

**Benefits:**
- Eliminates duplicate entry
- Ensures consistency
- Saves time

#### 4.1.4 Section Jump Navigation
```typescript
// Add floating section navigation
<div className="fixed right-4 top-1/2 -translate-y-1/2 z-50">
  <div className="bg-white border rounded-lg shadow-lg p-2 space-y-1 max-h-[60vh] overflow-y-auto">
    {INTRAOP_SECTIONS.map(section => (
      <button
        key={section.key}
        onClick={() => scrollToSection(section.key)}
        className="text-xs px-2 py-1 hover:bg-slate-100 rounded flex items-center gap-2"
      >
        {sectionCompletion[section.key]?.complete ? (
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
        ) : (
          <Circle className="h-3 w-3 text-slate-400" />
        )}
        <span>{section.title}</span>
      </button>
    ))}
  </div>
</div>
```

**Benefits:**
- Quick navigation between sections
- Visual progress indicator
- Reduces scrolling

### 4.2 Medium-Term Enhancements

#### 4.2.1 Progress Dashboard
- Add "Next Incomplete Section" button
- Show section completion percentages
- Highlight critical sections that are incomplete

#### 4.2.2 Quick Entry Mode
- Add "Quick Entry" toggle
- Show only essential fields
- Hide optional fields
- Faster data entry during active surgery

#### 4.2.3 Timeline Integration
- Embed timeline directly in timings section
- Remove separate timeline panel
- One-click "Set Now" buttons inline

#### 4.2.4 Smart Defaults
- Auto-fill staffing from accepted invites (already done, but could be more prominent)
- Auto-fill diagnoses from case plan
- Auto-fill allergies from patient record
- Auto-fill ASA class from pre-op

### 4.3 Long-Term Enhancements

#### 4.3.1 Mobile/Tablet Optimization
- Responsive accordion (stack on mobile)
- Touch-friendly time inputs
- Swipe gestures for section navigation
- Bottom sheet for dynamic tables

#### 4.3.2 Voice Input Support
- Voice-to-text for free text fields
- Hands-free documentation during surgery
- Integration with speech recognition API

#### 4.3.3 Inventory Integration
- Auto-populate implant list from inventory
- Real-time stock checking
- Automatic billing integration

#### 4.3.4 Collaborative Editing
- Multiple nurses can edit different sections
- Real-time updates (WebSocket)
- Conflict resolution

---

## 5. Implementation Priority Matrix

| Enhancement | Impact | Effort | Priority | Timeline |
|-------------|--------|--------|----------|----------|
| Auto-save | High | Low | P0 | Immediate |
| Smart section expansion | High | Low | P0 | Immediate |
| Pre-populate from pre-op | Medium | Medium | P1 | Week 1 |
| Section jump navigation | Medium | Low | P1 | Week 1 |
| Progress dashboard | Medium | Medium | P2 | Week 2 |
| Quick entry mode | Medium | High | P2 | Week 3 |
| Timeline integration | Low | Medium | P3 | Week 4 |
| Mobile optimization | Medium | High | P3 | Month 2 |

---

## 6. Technical Considerations

### 6.1 Performance
- Current form is ~1700 lines — consider code splitting
- Large form state — ensure React.memo for section components
- Auto-save should be debounced to avoid excessive API calls

### 6.2 Accessibility
- Ensure keyboard navigation works in accordion
- Screen reader support for section completion
- Focus management when sections expand/collapse

### 6.3 Data Integrity
- Auto-save must not interfere with finalization
- Ensure validation still works with auto-save
- Handle network failures gracefully

---

## 7. User Testing Recommendations

### 7.1 Test Scenarios
1. **Interruption Test:** Nurse starts form, gets interrupted, returns — does data persist?
2. **Speed Test:** How long to complete form during active surgery?
3. **Error Recovery:** What happens if finalization fails?
4. **Mobile Test:** Can nurse use form on tablet in theater?

### 7.2 Metrics to Track
- Time to complete form
- Number of saves before finalization
- Sections most frequently edited
- Finalization failure rate
- Mobile vs desktop usage

---

## 8. Conclusion

The intra-op record has **excellent domain architecture** but needs **significant UX improvements** for optimal nurse experience during active surgery. The top priorities are:

1. **Auto-save** — Critical for data safety
2. **Smart section expansion** — Critical sections visible immediately
3. **Pre-population** — Eliminate duplicate entry
4. **Section navigation** — Reduce scrolling

These improvements will transform the form from "functional but cumbersome" to "efficient and nurse-friendly" while maintaining all clinical safety requirements.

---

## 9. Next Steps

1. ✅ **Audit Complete** — This document
2. ⏭️ **Review with Clinical Team** — Validate priorities
3. ⏭️ **Implement P0 Items** — Auto-save + smart expansion
4. ⏭️ **User Testing** — Validate improvements
5. ⏭️ **Iterate** — Based on feedback

---

**Document Status:** Ready for Implementation  
**Reviewed By:** [Pending]  
**Approved By:** [Pending]
