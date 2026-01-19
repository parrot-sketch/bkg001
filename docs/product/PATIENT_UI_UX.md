# Patient-Facing UI/UX Documentation

## Overview

Professional, mobile-optimized UI/UX implementation for all patient-facing workflows in the Nairobi Sculpt Aesthetic Surgery system. The implementation focuses on delivering a seamless, intuitive, and branded experience aligned with Nairobi Sculpt colors, typography, and design principles.

---

## Design System

### Branding

- **Primary Color:** Deep Navy `#1a1a2e` (--primary)
- **Accent Color:** Gold `#d4af37` (--accent)
- **Typography:**
  - Headings: `Playfair Display` (serif, elegant)
  - Body: `Inter` (sans-serif, clean)
- **Icons:** Lucide React (standard icons only)

### UI Principles

- Clean, minimal layouts
- Consistent spacing (4px base unit)
- Mobile-first responsive design
- Touch-friendly targets (min 44x44px)
- Clear visual hierarchy
- Accessible (ARIA-compliant)

---

## Components

### 1. PatientRegistrationForm

**Location:** `components/patient/PatientRegistrationForm.tsx`

**Purpose:** Multi-step registration form with progress indicators

**Features:**
- 5-step process with visual progress indicator
- Step 1: Personal Information (name, DOB, gender, ID)
- Step 2: Contact Information (email, phone, address)
- Step 3: Emergency Contact
- Step 4: Medical History & Allergies
- Step 5: Consents (privacy, procedure, communication)

**Mobile Optimizations:**
- Single column layout on mobile
- Full-width buttons on mobile
- Touch-friendly form inputs
- Clear error messages
- Progress dots for step navigation

**Usage:**
```tsx
<PatientRegistrationForm
  initialData={existingData} // Optional pre-fill
  onSubmit={handleSubmit}
  isLoading={isLoading}
/>
```

---

### 2. StepByStepBooking

**Location:** `components/patient/StepByStepBooking.tsx`

**Purpose:** Step-by-step appointment booking workflow

**Features:**
- 4-step process:
  1. Select service/procedure
  2. Select doctor (with profile preview)
  3. Choose date/time
  4. Review and confirm
- Visual progress indicator (dots)
- Integrated doctor selection with profile modal
- Date/time validation
- Optional notes field

**Mobile Optimizations:**
- Single-step focus (one step at a time)
- Large touch targets
- Mobile-friendly date/time pickers
- Clear navigation buttons (Previous/Next)

**Usage:**
```tsx
<StepByStepBooking
  patientId={user.id}
  onSuccess={() => {
    // Refresh appointments, show success toast
  }}
  onCancel={() => {
    // Close booking flow
  }}
/>
```

---

### 3. DoctorProfileModal

**Location:** `components/patient/DoctorProfileModal.tsx`

**Purpose:** Mobile-optimized doctor profile viewer

**Features:**
- Responsive layout (centered on mobile, side-by-side on desktop)
- Full doctor information:
  - Profile image/avatar
  - Name, title, specialization
  - Bio, education, focus areas
  - Professional affiliations
  - Contact information
- Accessible modal (keyboard navigation, ARIA labels)

**Mobile Optimizations:**
- 95vw width on mobile (nearly full screen)
- Stacked layout for header section
- Scrollable content for long profiles
- Touch-friendly close button

**Usage:**
```tsx
<DoctorProfileModal
  open={isOpen}
  onClose={() => setIsOpen(false)}
  doctor={doctorData}
  loading={isLoading}
/>
```

---

### 4. AppointmentCard

**Location:** `components/patient/AppointmentCard.tsx`

**Purpose:** Reusable appointment card component

**Features:**
- Date, time, type, status
- Doctor information (avatar, name, title, clinic location)
- Clickable doctor name/profile to open modal
- Status color coding

**Mobile Optimizations:**
- Compact layout for mobile
- Touch-friendly doctor profile trigger
- Readable text sizes
- Status indicators clearly visible

---

### 5. Patient Dashboard

**Location:** `app/patient/dashboard/page.tsx`

**Purpose:** Main patient dashboard overview

**Features:**
- Welcome message with user name
- Quick stats cards (2-column grid on mobile, 4-column on desktop)
- Upcoming appointments list
- Pending actions
- Navigation to appointments, profile, etc.

**Mobile Optimizations:**
- 2-column grid for stats on mobile
- Responsive spacing (smaller padding on mobile)
- Touch-friendly cards
- Clear CTAs (Schedule Appointment button)

---

## Mobile-First Design Patterns

### Responsive Breakpoints

- **Mobile:** < 640px (default, mobile-first)
- **Tablet:** 640px - 1024px (sm: breakpoint)
- **Desktop:** > 1024px (md:, lg: breakpoints)

### Touch Targets

- Minimum 44x44px for all interactive elements
- Adequate spacing between buttons (16px minimum)
- Full-width buttons on mobile for primary actions

### Typography Scale

- **H1:** `text-2xl sm:text-3xl` (24px → 30px)
- **H2:** `text-xl sm:text-2xl` (20px → 24px)
- **Body:** `text-sm sm:text-base` (14px → 16px)
- **Small:** `text-xs` (12px)

### Spacing

- **Cards:** `p-3 sm:p-6` (12px → 24px padding)
- **Gaps:** `gap-3 sm:gap-4` (12px → 16px)
- **Margins:** `mt-2 sm:mt-4` (8px → 16px)

---

## Accessibility Features

### ARIA Labels

- All form inputs include `aria-invalid` for validation
- Progress indicators include `aria-label` for screen readers
- Modal dialogs include `aria-labelledby` for titles

### Keyboard Navigation

- Tab order follows visual flow
- Escape key closes modals
- Enter key submits forms
- Arrow keys navigate date/time pickers

### Screen Reader Support

- Semantic HTML (`<button>`, `<label>`, `<form>`)
- Descriptive alt text for images
- Error messages linked via `aria-describedby`

---

## Form Validation

### Inline Validation

- Real-time error messages
- Clear error styling (red border, error text)
- Validation on blur (after user leaves field)
- Step-by-step validation before progression

### Error Messages

- Clear, actionable messages
- Positioned below input fields
- Color-coded (red/destructive)
- Accessible via ARIA

---

## Loading States

### Skeleton Screens

- Placeholder content while loading
- Maintains layout structure
- Reduces perceived load time

### Spinners

- Centered spinners for full-page loads
- Inline spinners for component-level loads
- Consistent styling (primary color)

### Empty States

- Clear icon or illustration
- Helpful message
- Call-to-action button (e.g., "Schedule Appointment")

---

## Notification System

### Toast Notifications

- Success: Green background, checkmark icon
- Error: Red background, X icon
- Info: Blue background, info icon
- Duration: 4-5 seconds (auto-dismiss)

### In-App Notifications

- Banner-style notifications for important messages
- Dismissible
- Non-intrusive positioning

---

## Patient Journey Workflows

### 1. Registration & Onboarding

1. User visits `/patient/register`
2. Multi-step form guides through:
   - Personal info
   - Contact details
   - Emergency contact
   - Medical history
   - Consents
3. Progress indicator shows completion
4. Submit → Auto-login → Dashboard

### 2. Appointment Booking

1. User clicks "Schedule Appointment"
2. Step-by-step booking:
   - Select service type
   - Choose doctor (view profile)
   - Pick date/time
   - Review and confirm
3. Success toast → Appointment appears in list

### 3. Viewing Appointments

1. Dashboard shows upcoming appointments
2. Click appointment → View details
3. Click doctor name → View full profile
4. Quick actions: Reschedule, Cancel (if allowed)

### 4. Accessing Medical History

1. Navigate to `/patient/profile` or `/patient/consultations`
2. View past consultations
3. Collapsible sections for details
4. Download/view documents (if applicable)

---

## Best Practices

### Performance

- Lazy load images (doctor profiles)
- Debounce form inputs for validation
- Minimize API calls (cache doctor list)
- Code splitting for large components

### Error Handling

- Graceful degradation (offline mode)
- Clear error messages (user-friendly)
- Retry mechanisms (for failed API calls)
- Logging for debugging

### Testing

- Unit tests for form validation
- Integration tests for API calls
- E2E tests for complete workflows
- Accessibility tests (screen readers, keyboard nav)

---

## Future Enhancements

### Planned Features

1. **Offline Support**
   - Service worker for offline access
   - Sync when connection restored

2. **Push Notifications**
   - Appointment reminders
   - Pre-op instructions
   - Post-op follow-ups

3. **Enhanced Medical History**
   - Timeline view
   - Document upload/download
   - Medication tracking

4. **Multi-language Support**
   - English, Swahili
   - Language switcher

5. **Dark Mode**
   - System preference detection
   - Manual toggle

---

## Component Usage Examples

### Registration Form

```tsx
import { PatientRegistrationForm } from '@/components/patient/PatientRegistrationForm';

function RegisterPage() {
  const handleSubmit = async (data: FormData) => {
    // Call API to register patient
    await patientApi.register(data);
  };

  return (
    <PatientRegistrationForm
      onSubmit={handleSubmit}
      isLoading={isSubmitting}
    />
  );
}
```

### Booking Workflow

```tsx
import { StepByStepBooking } from '@/components/patient/StepByStepBooking';

function BookingPage() {
  const { user } = useAuth();

  return (
    <StepByStepBooking
      patientId={user.id}
      onSuccess={() => {
        router.push('/patient/appointments');
        toast.success('Appointment scheduled!');
      }}
      onCancel={() => router.back()}
    />
  );
}
```

---

## Documentation Links

- [Component Library](../components/)
- [API Integration](../api/)
- [Testing Guide](../testing/)
- [Accessibility Checklist](../accessibility.md)

---

## Support

For questions or issues with patient-facing UI/UX, please refer to:
- Component source code (TypeScript/React)
- Storybook (if available)
- Design system documentation
