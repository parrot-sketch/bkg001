# Layout Architecture

## Overview

This document describes the layout system used across the Nairobi Sculpt healthcare platform.

## Active Layout System

All role-based dashboards use a **unified layout pattern**:

```
app/
├── layout.tsx                    # Root: fonts, providers, toaster
├── (auth)/layout.tsx             # Auth pages: centered, no sidebar
├── portal/layout.tsx             # Pre-patient onboarding: header only
├── doctor/layout.tsx             # Doctor dashboard with sidebar
├── frontdesk/layout.tsx          # Frontdesk dashboard with sidebar
├── nurse/layout.tsx              # Nurse dashboard with sidebar
├── admin/layout.tsx              # Admin dashboard with sidebar
├── patient/layout.tsx            # Patient dashboard with sidebar
```

## Component Hierarchy

```
Role Layout (e.g., app/doctor/layout.tsx)
├── Mobile Menu Button (hamburger)
├── Role-Specific Sidebar (e.g., DoctorSidebar)
│   └── UnifiedSidebar (shared component)
│       ├── Logo Section
│       ├── User Info + Role Badge
│       ├── Navigation Items (role-specific)
│       └── Logout Button
└── ClinicalDashboardShell (content wrapper)
    └── Page Content (children)
```

## Key Components

### 1. UnifiedSidebar (`components/shared/UnifiedSidebar.tsx`)
The core sidebar UI. Features:
- Dark slate theme (`bg-slate-900`)
- Mobile responsive with overlay
- Role-specific color coding
- Navigation with active state
- 272px width (`w-72`, `lg:ml-72` offset for content)

### 2. Role-Specific Sidebars
Thin wrappers that provide:
- Navigation items specific to each role
- User info from auth context
- Dashboard href for logo click

Files:
- `components/doctor/DoctorSidebar.tsx`
- `components/frontdesk/FrontdeskSidebar.tsx`
- `components/nurse/NurseSidebar.tsx`
- `components/admin/AdminSidebar.tsx`
- `components/patient/PatientSidebar.tsx`
- `components/lab/LabTechnicianSidebar.tsx`
- `components/cashier/CashierSidebar.tsx`

### 3. ClinicalDashboardShell (`components/layouts/ClinicalDashboardShell.tsx`)
Standard content wrapper providing:
- Responsive padding
- Max width constraint (1920px)
- Consistent spacing across breakpoints

## Sidebar Width Standard

All sidebars use: `w-72` (288px)
Content offset: `lg:ml-72` 

> Note: Previously was `w-64` (256px) - updated for better spacing.

## Special Layouts

### Auth Layout (`app/(auth)/layout.tsx`)
- Centered content, no sidebar
- Used for: `/sign-in`, `/sign-up`, `/forgot-password`

### Portal Layout (`app/portal/layout.tsx`)
- Header with logo, no sidebar
- Used for: `/portal/welcome`, `/portal/get-started`
- Bridge between public site and patient dashboard

## Deprecated / Legacy (DO NOT USE)

The following are **deprecated** and scheduled for removal:

```
app/(protected)/           # Old layout system
components/sidebar.tsx     # Old server-side sidebar
components/navbar.tsx      # Old navbar (replaced by sidebar user info)
```

These use different styling, routing patterns, and component architecture.
Routes under `/record/*` should migrate to role-specific routes.

## Adding a New Role

1. Create sidebar: `components/[role]/[Role]Sidebar.tsx`
2. Create layout: `app/[role]/layout.tsx`
3. Follow the pattern from `DoctorSidebar` and `app/doctor/layout.tsx`
4. Ensure sidebar uses `UnifiedSidebar` and layout uses `ClinicalDashboardShell`
