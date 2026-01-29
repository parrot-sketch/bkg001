# Frontdesk User - Complete Feature Map

**Last Updated:** January 25, 2026  
**Status:** Production Ready  
**User Role:** FRONTDESK

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Role & Permissions](#role--permissions)
3. [Main Features](#main-features)
4. [Page Structure](#page-structure)
5. [Data Models](#data-models)
6. [API Endpoints](#api-endpoints)
7. [User Workflows](#user-workflows)
8. [Component Architecture](#component-architecture)
9. [Technical Stack](#technical-stack)

---

## 🎯 Overview

The **Frontdesk User** (Surgical Assistant) is the primary gatekeeper for patient inquiries and appointment management. They manage:
- Patient registration and intake
- Consultation request review and approval
- Appointment scheduling and check-in
- Doctor availability management
- Patient database access

### Key Characteristics:
- **Role Identifier:** `FRONTDESK`
- **Title:** Surgical Assistant
- **Primary Responsibilities:** Patient intake, consultation review, appointment management
- **Access Level:** Hospital-wide patient database
- **Authentication:** Email/password via centralized auth system

---

## 🔐 Role & Permissions

### Access Rights:
✅ View all patients in system  
✅ Register new patients  
✅ Search patients by email/phone  
✅ View patient profiles and medical history  
✅ View all appointments  
✅ Check in patients for appointments  
✅ Review consultation requests  
✅ Approve/reject inquiries  
✅ Request additional information from patients  
✅ View doctor availability  
✅ Schedule appointments for patients  
✅ View own profile  

### Restricted:
❌ Modify doctor profiles  
❌ Modify patient medical records  
❌ Access financial/billing data  
❌ Manage user accounts (except viewing)  
❌ Access admin settings  

---

## 🎨 Main Features

### 1. **Assistant Console (Dashboard)**
**Route:** `/frontdesk/dashboard`  
**Purpose:** Quick overview of daily operations and priorities

#### Features:
- **Quick Stats Cards:**
  - Sessions (today's appointments count)
  - Arrived (checked-in patients count)
  - Pending (awaiting check-in count)
  - Inquiries (new consultation requests count)

- **Pending Consultation Requests Section:**
  - New Inquiries (SUBMITTED, PENDING_REVIEW)
  - Awaiting Clarification (NEEDS_MORE_INFO)
  - Awaiting Scheduling (APPROVED)
  - Quick action buttons to navigate to each section

- **Available Doctors Panel:**
  - Shows doctor availability for scheduling
  - Filter by specialization
  - Quick reference for booking

- **Today's Sessions Card:**
  - List of confirmed appointments for today
  - Patient information and time
  - Quick access to appointment details

**Data Hooks Used:**
```
- useTodayAppointments() - Fetch today's appointments
- usePendingConsultations() - Fetch pending consultations
```

---

### 2. **Patient Management**

#### 2.1 Patient Listing & Search
**Route:** `/frontdesk/patients`  
**Purpose:** Browse and search patient database

**Features:**
- **Patient List Display:**
  - Mobile: Card-based layout with patient info
  - Desktop: Table view with sortable columns
  - Pagination support (configurable limit)

- **Patient Cards (Mobile):**
  - Profile image with initials
  - Full name, gender, age
  - File number (unique identifier)
  - Contact: Phone (clickable tel:), Email (clickable mailto:)
  - Last visit date
  - Action buttons: View Profile, Schedule Appointment

- **Patient Table (Desktop):**
  - Columns: Name, File Number, Contact, Gender, Age, Last Visit
  - Sortable headers
  - Hover states
  - Row actions: View, Schedule

- **Search & Filter:**
  - Search by name, file number, phone
  - Results update in real-time
  - Shows total patient count (695+ patients in system)

**API Integration:**
```
GET /patients - Get all patients with pagination
GET /patients/search?q={query} - Search patients
```

---

#### 2.2 Patient Intake & Registration
**Route:** `/frontdesk/patient-intake`  
**Purpose:** Register new patients into the system

**Features:**

- **Search for Existing Patients:**
  - Text input for searching by email/phone
  - Enter key to trigger search
  - Search button with loading state
  - Results displayed as cards with patient info

- **Search Results Display:**
  - Patient cards showing:
    - Name with avatar
    - File number
    - Email and phone
    - Age and gender
    - Action buttons: View Details, Schedule Appointment

- **Patient Registration Form:**
  - Triggered via "Register New Patient" button
  - Opens `PatientRegistrationDialog` component
  - Form fields:
    - First Name (required)
    - Last Name (required)
    - Email (required)
    - Phone (required)
    - Date of Birth (required)
    - Gender (required)
    - Address (optional)
    - Blood Group (optional)
    - Marital Status (optional)
  - Form validation
  - Success toast notification
  - Automatic search refresh after registration

**Components:**
- `PatientRegistrationDialog` - Registration form modal

**API Integration:**
```
POST /patients - Create new patient
GET /patients/search?q={query} - Search patients
```

---

#### 2.3 Patient Profile View
**Route:** `/frontdesk/patient/[patientId]`  
**Purpose:** View complete patient information and history

**Features:**

- **Patient Header Card:**
  - Profile image/avatar
  - Full name
  - File number (or ID if not assigned)
  - Email address
  - Quick Stats:
    - Total appointments
    - Last visit date

- **Personal Information Card:**
  - Gender
  - Date of birth
  - Phone number
  - Marital status
  - Blood group
  - Address
  - All fields read-only

- **Emergency Contact Card:**
  - Emergency contact person
  - Phone number
  - Relationship

- **Medical History:**
  - Past consultations
  - Procedures
  - Treatment plans
  - Medical records with dates

- **Patient Ratings:**
  - Patient feedback/ratings (if available)
  - Review comments

**API Integration:**
```
GET /patients/{id} - Get patient details
GET /patients/{id}/full - Get complete patient data with history
```

---

### 3. **Appointment Management**

#### 3.1 Appointments View & Check-in
**Route:** `/frontdesk/appointments`  
**Purpose:** View and manage daily appointments with check-in functionality

**Features:**

- **Filter Controls:**
  - Date Picker (default: today)
  - Status Filter (All, Pending, Checked In, Completed, Cancelled)
  - Search input (by patient/type/time)

- **Statistics Cards:**
  - Total appointments (for selected date)
  - Pending check-ins
  - Already checked in

- **Appointments List:**
  - Appointment cards showing:
    - Patient name and file number
    - Appointment time
    - Appointment type/procedure
    - Current status (visual indicator)
    - Doctor name
  - Status badges with color coding:
    - PENDING: Yellow/Orange
    - SCHEDULED: Green (checked in)
    - COMPLETED: Gray
    - CANCELLED: Red

- **Check-in Functionality:**
  - Check-in button on each appointment
  - Opens `CheckInDialog`
  - Updates appointment status to SCHEDULED
  - Toast notification on success
  - Automatic cache invalidation for real-time update

**Statuses Handled:**
- PENDING - Patient hasn't arrived yet
- SCHEDULED - Patient checked in
- COMPLETED - Appointment finished
- CANCELLED - Cancelled appointment

**Components:**
- `CheckInDialog` - Check-in confirmation modal
- `AppointmentCard` - Reusable appointment display

**API Integration:**
```
GET /appointments?date={date} - Get appointments by date
GET /appointments?status={status} - Get appointments by status
POST /appointments/{id}/checkin - Check in patient
```

---

### 4. **Consultation Request Management**

#### 4.1 Consultation Requests (Inquiries)
**Route:** `/frontdesk/consultations`  
**Purpose:** Review and manage patient consultation requests (inquiries)

**Features:**

- **Status Filter Tabs:**
  - New Requests (SUBMITTED, PENDING_REVIEW) - Default view
  - Awaiting Clarification (NEEDS_MORE_INFO)
  - Awaiting Scheduling (APPROVED)
  - All Requests - Show all statuses

- **Consultation Request Cards:**
  - Patient name and file number
  - Inquiry date/time submitted
  - Consultation concern/reason
  - Requested doctor (if specified)
  - Current status
  - Days since submission

- **Review Actions:**
  - Review button on each request
  - Opens `ReviewConsultationDialog`
  - Action options:
    - **Approve:** Accept inquiry, set proposed date/time, move to APPROVED status
    - **Request More Info:** Ask patient for additional details, status → NEEDS_MORE_INFO
    - **Reject:** Decline inquiry, status → CANCELLED

- **Review Dialog:**
  - Shows full inquiry details
  - Patient information
  - Original concern/message
  - Review notes input field
  - Date/time picker for approved appointments
  - Submit button with confirmation

**Consultation Request Statuses:**
- SUBMITTED - Initial inquiry
- PENDING_REVIEW - Awaiting review
- NEEDS_MORE_INFO - More info requested from patient
- APPROVED - Approved, ready to schedule
- SCHEDULED - Appointment confirmed
- CONFIRMED - Final confirmation
- CANCELLED - Rejected

**Components:**
- `ReviewConsultationDialog` - Review and action modal

**API Integration:**
```
GET /appointments?consultationRequestStatus={status} - Get by status
POST /consultations/{id}/review - Review consultation
```

---

### 5. **Doctor Availability**

#### 5.1 Available Doctors Panel
**Route:** Part of dashboard (`/frontdesk/dashboard`)  
**Purpose:** Quick reference for doctor availability when scheduling

**Features:**
- **Doctor List:**
  - Doctor name and specialization
  - Status: Available/Unavailable
  - Current schedule (if available)
  - Next available slot

- **Availability Indicators:**
  - Color coding for availability
  - Time slots available
  - Busy periods

**Components:**
- `AvailableDoctorsPanel` - Dashboard widget

**API Integration:**
```
GET /doctors/availability?startDate={date}&endDate={date} - Get availability
GET /doctors/availability?specialization={spec} - Filter by specialization
```

---

### 6. **User Profile**

#### 6.1 Profile Page
**Route:** `/frontdesk/profile`  
**Purpose:** View personal profile information

**Features:**
- **Read-Only Fields:**
  - First name
  - Last name
  - Email
  - Phone number
  - Role (FRONTDESK)

- **Profile Update Note:**
  - "Profile updates are managed by administrators"
  - Contact support message

**API Integration:**
```
Uses authenticated user context from useAuth() hook
```

---

## 📍 Page Structure

```
/frontdesk
├── /dashboard          - Assistant Console (main hub)
├── /appointments       - View and manage appointments
├── /patients          - Patient list and search
├── /patient-intake    - Register new patients
├── /patient/[id]      - Patient profile view
├── /consultations     - Consultation request review
├── /profile           - User profile view
└── layout.tsx         - Main layout with sidebar
```

### Layout Components:
- **FrontdeskLayout** - Main layout with sidebar
- **FrontdeskSidebar** - Navigation sidebar
  - Logo and branding
  - Nav items: Dashboard, Sessions, Patients, Client Intake, Profile
  - User info display
  - Logout button
  - Mobile toggle menu

---

## 📊 Data Models

### Key DTOs (Data Transfer Objects):

#### AppointmentResponseDto
```typescript
{
  id: number;
  patientId: string;
  doctorId: string;
  date: Date;
  time: string;
  type: string;
  status: AppointmentStatus;
  consultationRequestStatus: ConsultationRequestStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### PatientResponseDto
```typescript
{
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: Date;
  gender: string;
  address?: string;
  bloodGroup?: string;
  maritalStatus?: string;
  fileNumber?: string;
  img?: string;
  colorCode?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### CreatePatientDto
```typescript
{
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: Date;
  gender: string;
  address?: string;
  bloodGroup?: string;
  maritalStatus?: string;
}
```

#### CheckInPatientDto
```typescript
{
  appointmentId: number;
  userId: string;
}
```

#### DoctorAvailabilityResponseDto
```typescript
{
  doctorId: string;
  doctorName: string;
  specialization: string;
  date: Date;
  timeSlots: string[];
  availability: boolean;
}
```

### Enums:

#### AppointmentStatus
- PENDING
- SCHEDULED
- COMPLETED
- CANCELLED

#### ConsultationRequestStatus
- SUBMITTED
- PENDING_REVIEW
- NEEDS_MORE_INFO
- APPROVED
- SCHEDULED
- CONFIRMED
- CANCELLED

---

## 🔌 API Endpoints

### Base Path: `/api`

#### Appointments
```
GET  /appointments/today                              - Today's appointments
GET  /appointments?upcoming=true                      - Upcoming appointments
GET  /appointments?date={YYYY-MM-DD}                  - Appointments by date
GET  /appointments?status={status}                    - Appointments by status
GET  /appointments?startDate={date}&endDate={date}    - Date range
GET  /appointments/{id}                               - Get single appointment
POST /appointments/{id}/checkin                       - Check in patient
```

#### Consultations
```
GET  /consultations/pending                           - Pending consultations
GET  /appointments?consultationRequestStatus={status} - By consultation status
POST /consultations/{id}/review                       - Review consultation
```

#### Patients
```
GET  /patients                                        - All patients (paginated)
POST /patients                                        - Create new patient
GET  /patients/{id}                                   - Get patient details
GET  /patients/search?q={query}                       - Search patients
```

#### Doctors
```
GET  /doctors/availability?startDate={date}&endDate={date}&specialization={spec}
```

---

## 🔄 User Workflows

### Workflow 1: New Patient Registration
```
1. Frontdesk clicks "Register Patient"
2. Searches for existing patient (optional)
3. If not found, clicks "Register New Patient"
4. Fills registration form:
   - Basic info (name, email, phone, DOB)
   - Optional: Address, blood group, marital status
5. System creates patient record
6. Success notification
7. Patient added to database
8. Frontdesk can now schedule appointments for patient
```

### Workflow 2: Review Consultation Inquiry
```
1. Patient submits consultation inquiry
2. Frontdesk sees alert on dashboard (new inquiries count)
3. Clicks "Review" in consultation section
4. Views consultation requests page with new inquiries
5. Clicks "Review" on specific inquiry
6. ReviewConsultationDialog opens showing:
   - Patient info
   - Concern/message
   - Proposed surgery details
7. Frontdesk chooses action:
   a. APPROVE:
      - Sets proposed date and time
      - Status → APPROVED
      - Ready for scheduling
   b. REQUEST MORE INFO:
      - Adds review notes
      - Status → NEEDS_MORE_INFO
      - Patient receives notification
   c. REJECT:
      - Status → CANCELLED
      - Patient notified
8. Toast confirmation
9. Back to consultations list
```

### Workflow 3: Schedule Appointment
```
1. Patient inquiry is APPROVED
2. Frontdesk goes to Consultations page
3. Filters for APPROVED inquiries
4. Clicks "Schedule" button
5. Opens appointment booking dialog
6. Selects/confirms:
   - Doctor
   - Date and time
   - Appointment type
   - Notes
7. System checks availability
8. Creates appointment record
9. Status: SCHEDULED
10. Patient receives confirmation
```

### Workflow 4: Patient Check-in
```
1. Patient arrives at hospital
2. Frontdesk opens Appointments page
3. Filters for today (default)
4. Finds patient's appointment (status: PENDING)
5. Clicks "Check In" button
6. CheckInDialog appears with confirmation
7. Frontdesk confirms check-in
8. Appointment status → SCHEDULED
9. Success notification
10. Patient ready for consultation
11. List updates automatically
```

### Workflow 5: View Patient Profile
```
1. Frontdesk on Patients list
2. Finds patient (search or browse)
3. Clicks "View Profile"
4. Navigates to patient detail page
5. Views:
   - Personal information
   - Contact details
   - Medical history
   - Past appointments
   - Emergency contact
   - Patient ratings/feedback
6. Can click back to patient list
7. Or schedule new appointment
```

---

## 🧩 Component Architecture

### Page Components:
- **FrontdeskDashboardPage** - Main dashboard
- **FrontdeskAppointmentsPage** - Appointments view
- **FrontdeskPatientsPage** - Patient list
- **FrontdeskPatientIntakePage** - Patient registration
- **FrontdeskPatientProfile** - Patient detail
- **FrontdeskConsultationsPage** - Consultation review
- **FrontdeskProfilePage** - User profile

### UI Components:
- **FrontdeskSidebar** - Navigation sidebar
  - Mobile responsive with toggle menu
  - Logo and branding
  - Nav items with active states
  - User info display
  - Logout button

### Dialog Components:
- **PatientRegistrationDialog** - Patient registration form modal
- **CheckInDialog** - Check-in confirmation modal
- **ReviewConsultationDialog** - Consultation review modal

### Shared Components:
- **AppointmentCard** - Displays appointment info
- **PatientTable** - Desktop patient table
- **ProfileImage** - Patient avatar display
- **Card, Button, Input, Label** - UI primitives

### Layout Components:
- **FrontdeskLayout** - Main layout wrapper
  - Sidebar integration
  - Mobile menu button
  - Content area

---

## 🛠 Technical Stack

### Frontend:
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** Custom component library
- **Icons:** Lucide React
- **State Management:** React Query (TanStack Query)
- **Notifications:** Sonner (toast)
- **Date Handling:** date-fns
- **Routing:** Next.js App Router with dynamic segments

### Hooks Used:
```typescript
- useAuth() - Authentication context
- useTodayAppointments() - Fetch today's appointments
- usePendingConsultations() - Fetch pending consultations
- useAppointmentsByDate() - Fetch appointments by date
- useQueryClient() - React Query client manipulation
- useState() - Local state management
- useMemo() - Performance optimization
- usePathname() - Current route detection
- useRouter() - Navigation
- useSearchParams() - Query parameters
```

### API Integration:
- **frontdeskApi** - Dedicated API client for frontdesk operations
- **apiClient** - Base HTTP client
- **Response Format:** `{ success: boolean; data: T; error?: string }`

### Authentication:
- Centralized auth system via `useAuth()` hook
- Email/password authentication
- Role-based access control (FRONTDESK role)
- Session management

### Query Management:
- React Query for server state
- Automatic caching and retry logic
- Query invalidation on mutations
- Loading and error states

---

## 📱 Responsive Design

### Mobile (< 768px)
- Sidebar: Overlay menu with toggle button
- Patient list: Card-based layout
- Forms: Full-width inputs
- Tables: Converted to cards
- Spacing: Reduced for mobile devices
- Touch-friendly buttons: min-height 44px

### Tablet (768px - 1024px)
- Sidebar: Visible on left
- Patient list: Mixed card/table view
- Forms: Two-column layout
- Filters: Horizontal arrangement

### Desktop (> 1024px)
- Sidebar: Always visible (fixed left)
- Patient list: Full table view
- Forms: Two-column layout with optimal spacing
- All features fully visible

---

## 🔒 Security & Permissions

### Access Control:
- Role-based: FRONTDESK role check
- Patient isolation: Can only access hospital patients
- Account-level permissions enforced server-side
- Read-only profile (no editing)

### Data Protection:
- All patient data encrypted in transit (HTTPS)
- Sensitive data (DOB, phone) handled securely
- Session management via auth system
- No sensitive data in URLs

### Audit Trail:
- Patient registration logged
- Appointment check-ins recorded
- Consultation reviews tracked
- Who/when/what recorded for compliance

---

## 📈 Performance Optimizations

### Frontend:
- React Query for caching and deduplication
- useMemo for expensive calculations
- Client-side filtering for large datasets
- Pagination support (configurable limit)
- Code splitting via Next.js routes

### UX:
- Instant visual feedback (toast notifications)
- Skeleton loading states
- Query cache for faster navigation
- Optimistic updates

### API:
- Limit queries (200 appointments max, 100 consultations max)
- Date-based filtering to reduce data transfer
- Search-based patient queries
- Status-based consultation queries

---

## 🚀 Deployment & Environment

### Production Ready:
✅ Type-safe TypeScript throughout  
✅ Error handling and validation  
✅ Responsive mobile design  
✅ Accessible UI components  
✅ Performance optimized  
✅ Security enforced  
✅ Tested workflows  

### Configuration:
- Environment variables for API endpoints
- Date formatting locale-aware
- Theme colors via Tailwind config
- Navigation structure in constants

---

## 📝 Summary Table

| Feature | Route | Status | Mobile |
|---------|-------|--------|--------|
| Dashboard | `/frontdesk/dashboard` | ✅ Active | ✅ Responsive |
| Appointments | `/frontdesk/appointments` | ✅ Active | ✅ Responsive |
| Patients | `/frontdesk/patients` | ✅ Active | ✅ Responsive |
| Patient Intake | `/frontdesk/patient-intake` | ✅ Active | ✅ Responsive |
| Patient Profile | `/frontdesk/patient/[id]` | ✅ Active | ✅ Responsive |
| Consultations | `/frontdesk/consultations` | ✅ Active | ✅ Responsive |
| Profile | `/frontdesk/profile` | ✅ Active | ✅ Responsive |
| Check-in | Dialog/Modal | ✅ Active | ✅ Responsive |
| Review Consultation | Dialog/Modal | ✅ Active | ✅ Responsive |

---

## 🔗 Related Resources

- [Frontdesk UI Refactoring](./FRONTDESK_UI_REFACTORING_COMPLETE.md)
- [Frontdesk Mobile Audit](./FRONTDESK_MOBILE_AUDIT.md)
- [Booking Workflow](./docs/workflow/BOOKING_WORKFLOW.md)
- [Patient Listing Analysis](./docs/patient-listing-analysis.md)
- [Doctor Journey Design](./docs/doctor/doctor-journey-design.md)

---

**Created By:** Development Team  
**Last Reviewed:** January 25, 2026  
**Maintenance:** Ongoing
