# Mobile-First UI Implementation Principles

## Core Principle

**All UI implementations must be highly optimized for mobile devices.**

Most patients will access the Nairobi Sculpt portal on mobile devices. Every component, form, and page must prioritize mobile experience.

## Design Rules

### 1. Mobile-First Layout

**Start with mobile, scale up:**
- Design for smallest screen first (320px)
- Use responsive breakpoints: `sm:`, `md:`, `lg:`, `xl:`
- Stack vertically on mobile, horizontal on desktop

**Example:**
```tsx
// ✅ GOOD - Mobile-first
<div className="space-y-4 sm:grid sm:grid-cols-2 sm:gap-4">
  <input />
  <input />
</div>

// ❌ BAD - Desktop-first
<div className="grid grid-cols-2 gap-4 flex-col">
```

### 2. Touch Targets

**Minimum 44px × 44px:**
- All buttons, links, inputs must be at least 44px tall
- Padding: Minimum 12px (padding-3)
- Spacing: Generous gaps between interactive elements

**Example:**
```tsx
// ✅ GOOD - Large touch target
<Button className="h-11 min-h-[44px] px-6">
  Submit
</Button>

// ❌ BAD - Too small
<button className="h-8 px-2">Submit</button>
```

### 3. Typography

**Readable on small screens:**
- Base text: `text-sm` (14px) minimum on mobile
- Headings: Scale appropriately (`text-2xl sm:text-3xl`)
- Line height: At least 1.5 for body text
- Contrast: WCAG AA minimum

**Example:**
```tsx
// ✅ GOOD - Mobile-readable
<p className="text-sm sm:text-base leading-relaxed">
  Description text
</p>

// ❌ BAD - Too small
<p className="text-xs">
  Description text
</p>
```

### 4. Forms

**Mobile-optimized inputs:**
- Full width on mobile (`w-full`)
- Height: Minimum `h-11` (44px)
- Padding: Generous (`px-4 py-3`)
- Labels: Always visible (not placeholders only)
- Error messages: Clear, below input
- Focus states: Strong, visible ring

**Example:**
```tsx
// ✅ GOOD - Mobile form field
<div className="space-y-2">
  <Label htmlFor="email">Email Address</Label>
  <Input
    id="email"
    className="h-11 w-full px-4 focus:ring-2 focus:ring-teal-500"
  />
  {error && (
    <p className="text-xs text-red-600 mt-1">{error}</p>
  )}
</div>
```

### 5. Multi-Step Forms

**Progress indication:**
- Show current step clearly
- Progress bar or step indicators
- Can't skip steps (validation at each step)
- Back button available
- Save progress (optional, for long forms)

**Example:**
```tsx
// ✅ GOOD - Clear progress
<div className="flex items-center justify-between mb-8">
  <div className="flex-1">
    <div className="text-sm text-gray-600">Step 2 of 5</div>
    <div className="h-2 bg-gray-200 rounded-full mt-2">
      <div className="h-2 bg-teal-500 rounded-full" style={{ width: '40%' }} />
    </div>
  </div>
</div>
```

### 6. Cards & Components

**Stack vertically on mobile:**
- Single column on mobile
- Multiple columns on desktop (`sm:grid-cols-2`)
- Padding: Generous (`p-4 sm:p-6`)
- Borders: Subtle but visible

**Example:**
```tsx
// ✅ GOOD - Mobile-stacked
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
  <Card>...</Card>
  <Card>...</Card>
</div>
```

### 7. Navigation

**Thumb-friendly:**
- Bottom navigation on mobile (if needed)
- Sticky header (top navigation)
- Large tap targets (min 44px)
- Clear visual hierarchy

### 8. Data Tables

**Avoid horizontal scroll:**
- Stack rows vertically on mobile
- Hide less important columns on small screens
- Show key info first
- Use cards instead of tables when possible

### 9. Modals & Dialogs

**Mobile-optimized:**
- Full screen or near-full on mobile (`w-[95vw]`)
- Max height: `max-h-[90vh]` with scroll
- Close button: Large, thumb-reachable
- Padding: `p-4 sm:p-6`

### 10. Spacing

**Generous spacing:**
- Minimum 16px (gap-4) between sections
- 12px (gap-3) between related items
- 8px (gap-2) for tight groups
- Avoid cramped layouts

## Tailwind Mobile-First Utilities

**Use responsive prefixes:**
```tsx
// Mobile-first approach
<div className="
  flex flex-col        // Mobile: column
  sm:flex-row          // Desktop: row
  gap-4                // Mobile: 16px
  sm:gap-6             // Desktop: 24px
  text-sm              // Mobile: 14px
  sm:text-base         // Desktop: 16px
  px-4                 // Mobile: 16px
  sm:px-6              // Desktop: 24px
">
```

## Testing Checklist

Before deploying any UI component:

- [ ] Test on 320px width (iPhone SE)
- [ ] Test on 375px width (iPhone 12/13/14)
- [ ] Test on 414px width (iPhone 11 Pro Max)
- [ ] All buttons ≥ 44px tall
- [ ] Text readable without zooming
- [ ] No horizontal scroll
- [ ] Touch targets not overlapping
- [ ] Forms easy to fill on mobile
- [ ] Loading states visible
- [ ] Error messages clear and visible

## Implementation Guidelines

### For Consultation Booking Form

**Multi-step form must:**
1. One step visible at a time (mobile-friendly)
2. Clear progress indicator
3. Large inputs (`h-11` minimum)
4. Full-width buttons on mobile
5. Can't skip steps
6. Save progress between steps (optional)
7. Validation at each step (prevents errors)

### For Profile Forms

**Progressive forms must:**
1. Vertical layout on mobile
2. Single column on mobile
3. Labels always visible
4. Error messages below inputs
5. Large submit buttons
6. Optional fields clearly marked

### For Doctor Listing

**List/directory pages must:**
1. Cards stack vertically on mobile
2. Filter/search at top (easy to reach)
3. Large tap targets for cards
4. Minimal horizontal scrolling
5. Image optimization for mobile

## References

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [iOS Human Interface Guidelines - Touch Targets](https://developer.apple.com/design/human-interface-guidelines/ios/visual-design/adaptivity-and-layout/)
- [Material Design - Touch Targets](https://material.io/design/usability/accessibility.html#layout-and-typography)
