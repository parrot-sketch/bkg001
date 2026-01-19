# Portal UX Consistency Guide

**System:** Nairobi Sculpt Patient Portal  
**Last Updated:** Current  
**Purpose:** Ensure cohesive, production-grade patient portal experience

---

## Product Principle

**"Professional clinical system with the simplicity of a consumer app."**

Every feature must feel like part of the same healthcare-grade system, not a collection of disconnected screens.

---

## Core Principles

### 1. **UX Consistency**
- **Button Labels:** Use consistent terminology across all pages
  - Primary action: "Book Consultation" (for authenticated users)
  - Secondary action: "Request Consultation" (when doctor context exists)
  - Never mix: "Book", "Schedule", "Request", "Create Appointment"
- **Page Tone:** Clinical, calm, professional, trustworthy
- **Spacing & Typography:** Consistent across all pages (use design system tokens)
- **Input Styles:** Unified form inputs, selects, checkboxes
- **Color Scheme:** Teal-500 primary, gray-200 borders, white backgrounds

### 2. **Feature Alignment**
- All booking actions must lead to `/portal/book-consultation`
- Doctor profiles must be accessible from all contexts (`/portal/doctors/[id]`)
- Service information must be discoverable and consistent
- No duplicated booking flows or logic

### 3. **Logical Navigation**
- Every page has clear next steps
- No dead-ends: users always know where to go next
- Breadcrumbs or back buttons where appropriate
- Mobile-first: navigation works perfectly on phones

### 4. **Professional Clinical Tone**
- Use respectful, clear language
- Avoid marketing jargon ("Unlock your potential", "Transform yourself")
- Prefer clinical accuracy ("Consultation", "Treatment", "Procedure")
- Build trust through transparency

### 5. **Seamless Journeys**
- Context preservation: selected doctor/service pre-filled in booking flow
- State persistence: form data survives navigation where appropriate
- No re-entry of information already provided
- Progressive disclosure: show only what's needed when needed

---

## Button Label Standards

### Primary Actions
- **"Book Consultation"** - Primary CTA for booking flow (welcome page, main landing)
- **"Request Consultation"** - When doctor context exists (doctor profile, doctor listing)
- **"Continue"** - Multi-step flows (booking steps)
- **"Submit Request"** - Final step of booking form

### Secondary Actions
- **"View Profile"** - Doctor/patient profile links
- **"Back"** or **"Previous"** - Navigation in multi-step flows
- **"Explore"** - Discovery actions (doctors, services)
- **"Learn more"** - External links to website

### Avoid
- ❌ "Schedule" (ambiguous - appointment vs consultation)
- ❌ "Create Appointment" (too technical)
- ❌ "Get Started" (too generic)
- ❌ "Book Now" (too pushy for clinical context)

---

## Navigation Flow Rules

### Core Portal Routes
```
/portal/welcome → Entry point for authenticated users
/portal/book-consultation → Unified booking flow
/portal/doctors → Doctor directory
/portal/doctors/[id] → Doctor profile
/portal/profile → User profile completion
```

### Context Preservation
- **From Doctor Profile:** `/portal/book-consultation?doctorId=xxx`
- **From Service Selection:** `/portal/book-consultation?serviceId=xxx`
- **From Welcome Page:** `/portal/book-consultation` (no pre-selection)

### Redirect Logic
- **Authenticated users without patient profile:** `/portal/welcome`
- **Authenticated users with patient profile:** `/patient/dashboard` (clinical portal)
- **Unauthenticated users:** `/patient/login`

---

## Component Reuse Standards

### Must Use Shared Components
1. **DoctorCard** - Display doctor information consistently
   - Location: `components/portal/DoctorCard.tsx`
   - Props: `doctor`, `variant`, `showCTA`

2. **ServiceCard** - Display service information consistently
   - Location: `components/portal/ServiceCard.tsx`
   - Props: `service`, `variant`, `showCTA`

3. **ConsultationCTA** - Consistent booking CTA buttons
   - Location: `components/portal/ConsultationCTA.tsx`
   - Props: `doctorId?`, `serviceId?`, `variant`

4. **PortalHeader** - Consistent header across portal pages
   - Location: `components/portal/PortalHeader.tsx`
   - Shared via `app/portal/layout.tsx`

### Design Tokens (Use These)
```typescript
// Colors
primary: 'teal-500'
primaryHover: 'teal-600'
border: 'gray-200'
borderHover: 'gray-300'
textPrimary: 'slate-900'
textSecondary: 'gray-600'

// Spacing
sectionGap: 'mb-8'
cardPadding: 'p-6 sm:p-8'
buttonHeight: 'h-11'

// Typography
heading1: 'text-2xl sm:text-3xl font-semibold text-slate-900'
heading2: 'text-xl font-semibold text-slate-900'
body: 'text-sm text-gray-600'
```

---

## Page Structure Standards

### Standard Page Layout
```tsx
<div className="min-h-screen bg-white">
  <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {/* Header */}
    <div className="mb-8">
      <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mb-2">
        Page Title
      </h1>
      <p className="text-sm text-gray-600">
        Page description
      </p>
    </div>

    {/* Content */}
    <div className="space-y-6">
      {/* Page-specific content */}
    </div>
  </div>
</div>
```

### Loading States
```tsx
<div className="flex items-center justify-center min-h-[60vh]">
  <div className="text-center">
    <div className="h-8 w-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
    <p className="text-sm text-gray-600">Loading...</p>
  </div>
</div>
```

### Empty States
```tsx
<div className="text-center py-12">
  <p className="text-sm text-gray-500 mb-2">No items found.</p>
  <p className="text-xs text-gray-400">Try a different filter or check back later.</p>
</div>
```

---

## Form Standards

### Input Styling
```tsx
<Input
  className="h-11 bg-white border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
  required
/>
```

### Select Styling
```tsx
<SelectTrigger className="h-11 bg-white border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500">
  <SelectValue placeholder="Select" />
</SelectTrigger>
```

### Button Styling
```tsx
// Primary
<Button className="h-11 px-6 bg-teal-500 hover:bg-teal-600 text-white">

// Secondary
<Button variant="outline" className="h-11 px-6 border-gray-300 hover:bg-gray-50">
```

---

## Mobile-First Design Rules

1. **Touch Targets:** Minimum 44x44px (h-11)
2. **Text Size:** Minimum 14px for body text
3. **Spacing:** Use responsive padding (`p-4 sm:p-6 lg:p-8`)
4. **Grid:** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
5. **Actions:** Stack vertically on mobile, horizontal on desktop

---

## Content Guidelines

### Do's ✅
- "Book Consultation" (clear, professional)
- "Meet Our Doctors" (friendly but professional)
- "Request Consultation with Dr. [Name]" (personal, contextual)
- "What happens next?" (transparent process)
- "Our care team will contact you within 24 hours" (clear expectations)

### Don'ts ❌
- "Get Started" (too generic)
- "Transform Your Life" (marketing speak)
- "Unlock Your Potential" (not clinical)
- "Book Now" (too pushy)
- "Schedule Your Appointment" (too technical for patients)

---

## Testing Checklist

Before marking a portal feature complete, verify:

- [ ] Button labels match standards
- [ ] Navigation flows logically (no dead-ends)
- [ ] Mobile experience is smooth (test on actual device)
- [ ] Loading states are consistent
- [ ] Empty states provide helpful guidance
- [ ] Context is preserved in booking flow (doctor/service pre-filled)
- [ ] Form validation messages are clear and helpful
- [ ] Colors and spacing match design system
- [ ] Components are reused (not duplicated)
- [ ] Page feels like part of the same system

---

## Success Criteria

The portal should feel like:
- ✅ **One coherent medical-grade product** - Not a set of disconnected features
- ✅ **Professional but approachable** - Clinical accuracy with consumer simplicity
- ✅ **Mobile-optimized** - Works perfectly on phones
- ✅ **Trustworthy** - Clear, transparent, no surprises

Every new feature must strengthen the whole.

---

## Quick Reference: Common Patterns

### Add "Book Consultation" CTA
```tsx
import { ConsultationCTA } from '@/components/portal/ConsultationCTA';

<ConsultationCTA doctorId={doctor?.id} />
```

### Display Doctor
```tsx
import { DoctorCard } from '@/components/portal/DoctorCard';

<DoctorCard doctor={doctor} variant="compact" showCTA />
```

### Display Service
```tsx
import { ServiceCard } from '@/components/portal/ServiceCard';

<ServiceCard service={service} variant="selectable" showCTA />
```

### Link to Booking with Context
```tsx
import Link from 'next/link';

<Link href={`/portal/book-consultation?doctorId=${doctor.id}`}>
  <Button>Request Consultation</Button>
</Link>
```

---

**Remember:** This is a healthcare-grade product, not a collection of screens. Every feature must feel intentional, consistent, and trustworthy.