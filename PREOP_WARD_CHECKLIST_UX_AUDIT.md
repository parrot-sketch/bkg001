# Pre-Operative Ward Checklist UX Audit

**Date:** 2025-01-XX  
**Context:** Nurse completes pre-op ward checklist before patient goes to theater  
**URL:** `/nurse/ward-prep/[id]/checklist`  
**Form Length:** 8 sections, ~100+ fields  
**Status:** ✅ Database error fixed (procedure_record include removed)

---

## Executive Summary

The pre-op ward checklist is a **well-structured clinical form** with good domain architecture and several UX improvements over the intra-op record. However, it shares some common UX challenges with the intra-op form, particularly around auto-save, section navigation, and data pre-population.

**Key Findings:**
- ✅ **Strong:** Amendment pattern, structured enums, vitals warnings, print route
- ⚠️ **Needs Improvement:** Auto-save, section expansion defaults, pre-population
- 🔴 **Critical:** No auto-save, all sections expanded by default (better than intra-op but still needs optimization)

---

## 1. Current Implementation Analysis

### 1.1 Architecture Strengths

✅ **Domain-Driven Design**
- Clean Zod schemas with structured enums (SkinPrepAgent, SkinPrepArea, UrinalysisResult)
- Draft vs final validation
- Section completion heuristics
- Amendment pattern support (FINAL → AMENDMENT → FINAL)

✅ **State Management**
- React Query for server state
- Proper cache invalidation
- Error handling with structured missing items

✅ **Clinical Safety Features**
- Vitals warnings (soft warnings via `getVitalsWarningMap`)
- Allergies prominently displayed
- Amendment workflow for corrections
- Print route for physical records

✅ **Better UX Patterns (vs Intra-Op)**
- All sections expanded by default (`defaultValue={CHECKLIST_SECTIONS.map((s) => s.key)}`)
- Amendment dialog with reason requirement
- Amendment status badge
- Better visual hierarchy

### 1.2 UX Pain Points

#### 🔴 **Critical Issues**

1. **No Auto-Save**
   - Nurse must manually click "Save Draft"
   - Risk of data loss during interruptions
   - No visual indicator of unsaved changes (except bottom bar)
   - **Impact:** High — nurses may lose work during patient prep

2. **All Sections Expanded by Default**
   - While better than collapsed, still creates long scroll
   - No smart expansion (critical sections first)
   - No section jump navigation
   - **Impact:** Medium — better than intra-op but could be optimized

3. **Limited Pre-Population**
   - Allergies pre-populated (good!)
   - But ASA class, patient demographics not pre-filled
   - No integration with case plan data
   - **Impact:** Medium — duplicate data entry

#### ⚠️ **Medium Priority Issues**

4. **No Section Jump Navigation**
   - Long scroll distance between sections
   - No floating navigation sidebar
   - No "Next Incomplete Section" button
   - **Impact:** Medium — inefficient navigation

5. **Progress Tracking Basic**
   - Progress bar shows completion but not which sections
   - Section completion logic is basic (any field filled = complete)
   - No visual indicator of required vs optional fields
   - **Impact:** Low — functional but could be enhanced

6. **Medication Administration List**
   - Uses separate component (`MedicationAdministrationList`)
   - Good integration but could have bulk actions
   - No inventory integration for medication lookup
   - **Impact:** Low — works well but could be more efficient

7. **Vitals Entry**
   - Good warning system
   - But no quick-entry shortcuts
   - No "Copy from last vitals" feature
   - **Impact:** Low — functional but could save time

---

## 2. Comparison with Intra-Op Record

### 2.1 Pre-Op Advantages

✅ **Better Default State**
- All sections expanded by default (vs collapsed in intra-op)
- Better visual overview

✅ **Amendment Pattern**
- Well-implemented amendment workflow
- Clear amendment status indicators
- Reason requirement for amendments

✅ **Structured Enums**
- Better structured data (SkinPrepAgent, SkinPrepArea, UrinalysisResult)
- Custom fallback for "OTHER" options
- Better validation

✅ **Vitals Warnings**
- Soft warnings system
- Visual indicators for abnormal values
- Better UX than intra-op

### 2.2 Shared Issues

⚠️ **Both Forms Have:**
- No auto-save
- No section jump navigation
- Limited pre-population
- Basic progress tracking
- Long scroll distance

---

## 3. Detailed Section Analysis

### 3.1 Section-by-Section UX Review

| Section | Fields | UX Issues | Priority |
|---------|--------|-----------|----------|
| **1. Documentation** | 2 | Simple checkboxes, no issues | Low |
| **2. Blood Results** | 4 | Could pre-populate from lab results if available | Low |
| **3. Medications** | 7 | Good MedicationAdministrationList integration | Low |
| **4. Allergies & NPO** | 4 | ✅ Allergies pre-populated! NPO time could auto-fill from case plan | Medium |
| **5. Preparation** | 6 | Skin prep structured well, could pre-populate from case plan | Low |
| **6. Prosthetics** | 5 | Simple checkboxes, no issues | Low |
| **7. Vitals & Observations** | 12 | ✅ Good warnings! Could add quick-entry shortcuts | Low |
| **8. Handover** | 4 | Simple fields, could auto-fill nurse name | Low |

### 3.2 Critical Sections

**Allergies & NPO (Section 4)**
- ✅ Allergies pre-populated from patient record
- ⚠️ NPO status could be inferred from case plan
- ⚠️ Fasted from time could be calculated from scheduled time

**Vitals & Observations (Section 7)**
- ✅ Excellent warning system
- ✅ Urinalysis enum with custom fallback
- ⚠️ Could add "Copy from last vitals" feature
- ⚠️ Could add quick-entry shortcuts for common values

---

## 4. Recommended UX Enhancements

### 4.1 Immediate Improvements (High Impact, Low Effort)

#### 4.1.1 Auto-Save Implementation
```typescript
// Add debounced auto-save (save after 2s of inactivity)
useEffect(() => {
  if (!isDirty || isFinalized || isAmendment) return;
  
  const timer = setTimeout(() => {
    saveMutation.mutate(formData, { onSuccess: () => setIsDirty(false) });
  }, 2000);
  
  return () => clearTimeout(timer);
}, [formData, isDirty]);
```

**Benefits:**
- Prevents data loss
- Reduces cognitive load
- Nurse can focus on patient care

#### 4.1.2 Smart Section Expansion
```typescript
// Expand critical sections by default, collapse others
const defaultExpanded = [
  'allergiesNpo',    // Critical safety
  'vitals',         // Critical vitals
  'documentation',   // First section
];
```

**Benefits:**
- Nurse sees critical sections immediately
- Reduces initial scroll
- Better visual hierarchy

#### 4.1.3 Enhanced Pre-Population
```typescript
// In API route, pre-populate from case plan and patient
const emptyData = {
  allergiesNpo: {
    allergiesDetails: surgicalCase.patient.allergies || '',
    allergiesDocumented: !!surgicalCase.patient.allergies,
    npoStatus: surgicalCase.case_plan?.planned_anesthesia ? true : false,
    npoFastedFromTime: calculateFastedTime(surgicalCase.theater_booking?.start_time),
  },
  handover: {
    preparedByName: auth.user.firstName + ' ' + auth.user.lastName,
  },
};
```

**Benefits:**
- Eliminates duplicate entry
- Ensures consistency
- Saves time

#### 4.1.4 Section Jump Navigation
```typescript
// Add floating section navigation (same as intra-op recommendation)
<div className="fixed right-4 top-1/2 -translate-y-1/2 z-50">
  <div className="bg-white border rounded-lg shadow-lg p-2 space-y-1 max-h-[60vh] overflow-y-auto">
    {CHECKLIST_SECTIONS.map(section => (
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
- Highlight required vs optional fields

#### 4.2.2 Quick Entry Mode
- Add "Quick Entry" toggle
- Show only essential fields
- Hide optional fields
- Faster data entry during busy periods

#### 4.2.3 Vitals Shortcuts
- "Copy from last vitals" button
- Quick-entry buttons for common values
- Auto-calculate BMI from height/weight

#### 4.2.4 Case Plan Integration
- Pre-populate NPO status from anesthesia plan
- Pre-populate skin prep from case plan
- Show case plan reference more prominently

### 4.3 Long-Term Enhancements

#### 4.3.1 Mobile/Tablet Optimization
- Responsive accordion (stack on mobile)
- Touch-friendly inputs
- Swipe gestures for section navigation

#### 4.3.2 Lab Results Integration
- Auto-populate blood results from lab system
- Show lab result history
- Flag abnormal values

#### 4.3.3 Medication Integration
- Auto-populate from medication administration list
- Drug interaction checking
- Allergy checking against medications

---

## 5. Implementation Priority Matrix

| Enhancement | Impact | Effort | Priority | Timeline |
|-------------|--------|--------|----------|----------|
| Auto-save | High | Low | P0 | Immediate |
| Smart section expansion | Medium | Low | P1 | Week 1 |
| Enhanced pre-population | Medium | Medium | P1 | Week 1 |
| Section jump navigation | Medium | Low | P1 | Week 1 |
| Progress dashboard | Medium | Medium | P2 | Week 2 |
| Quick entry mode | Medium | High | P2 | Week 3 |
| Vitals shortcuts | Low | Medium | P3 | Week 4 |
| Mobile optimization | Medium | High | P3 | Month 2 |

---

## 6. Technical Considerations

### 6.1 Performance
- Form is ~1280 lines — consider code splitting
- Auto-save should be debounced to avoid excessive API calls
- Section completion calculation is efficient

### 6.2 Accessibility
- Ensure keyboard navigation works in accordion
- Screen reader support for section completion
- Focus management when sections expand/collapse

### 6.3 Data Integrity
- Auto-save must not interfere with finalization
- Amendment workflow must preserve audit trail
- Ensure validation still works with auto-save

---

## 7. Comparison Summary: Pre-Op vs Intra-Op

| Feature | Pre-Op | Intra-Op | Winner |
|---------|--------|----------|--------|
| **Default Section State** | All expanded | All collapsed | ✅ Pre-Op |
| **Amendment Pattern** | ✅ Implemented | ❌ Not implemented | ✅ Pre-Op |
| **Structured Enums** | ✅ Excellent | ⚠️ Basic | ✅ Pre-Op |
| **Vitals Warnings** | ✅ Soft warnings | ⚠️ Hard warnings only | ✅ Pre-Op |
| **Auto-Save** | ❌ No | ❌ No | ⚠️ Tie |
| **Section Navigation** | ❌ No | ❌ No | ⚠️ Tie |
| **Pre-Population** | ⚠️ Partial | ⚠️ Partial | ⚠️ Tie |
| **Form Length** | 8 sections | 14 sections | ✅ Pre-Op |
| **Print Route** | ✅ Implemented | ✅ Implemented | ⚠️ Tie |

**Overall:** Pre-op checklist has **better UX patterns** than intra-op, but both need auto-save and navigation improvements.

---

## 8. Conclusion

The pre-op ward checklist is **well-implemented** with good domain architecture and several UX improvements over the intra-op record. The top priorities are:

1. **Auto-save** — Critical for data safety
2. **Smart section expansion** — Optimize initial view
3. **Enhanced pre-population** — Eliminate duplicate entry
4. **Section navigation** — Reduce scrolling

These improvements will make the form more efficient while maintaining all clinical safety requirements.

---

## 9. Next Steps

1. ✅ **Audit Complete** — This document
2. ✅ **Database Error Fixed** — procedure_record include removed
3. ⏭️ **Review with Clinical Team** — Validate priorities
4. ⏭️ **Implement P0 Items** — Auto-save + smart expansion
5. ⏭️ **User Testing** — Validate improvements
6. ⏭️ **Iterate** — Based on feedback

---

**Document Status:** Ready for Implementation  
**Reviewed By:** [Pending]  
**Approved By:** [Pending]
