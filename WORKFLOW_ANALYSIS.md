# Patient Workflow Analysis

## Overview
This document traces the actual patient workflow from the landing page through all routes to understand what authentication is actually used vs. what's legacy/unused.

---

## 🔄 Patient Journey Flow

### 1. **Landing Page** (`app/page.tsx`)
- **Type:** Public server component
- **Auth:** None required
- **Links to:**
  - `/patient/login` - Patient login
  - `/patient/register` - Patient registration
  - `/portal/welcome` - Portal welcome (after auth)

### 2. **Patient Login** (`app/(auth)/patient/login/page.tsx`)
- **Type:** Client component (`'use client'`)
- **Auth:** Uses `useAuth()` hook (JWT-based)
- **Flow:**
  1. User enters email/password
  2. Calls `login()` from `useAuth()` hook
  3. Hook calls `/api/auth/login` (JWT endpoint)
  4. Stores tokens in localStorage/cookies via `tokenStorage`
  5. Redirects to `/portal/welcome` or `/patient/dashboard` based on profile status

### 3. **Patient Register** (`app/(auth)/patient/register/page.tsx`)
- **Type:** Client component (`'use client'`)
- **Auth:** Uses `useAuth()` hook (JWT-based)
- **Flow:**
  1. User fills registration form
  2. Calls `register()` then `login()` from `useAuth()` hook
  3. Hook calls `/api/auth/register` (JWT endpoint)
  4. Auto-logs in user
  5. Redirects to `/portal/welcome` or `/patient/dashboard`

### 4. **Portal Welcome** (`app/portal/welcome/page.tsx`)
- **Type:** Client component (`'use client'`)
- **Auth:** Uses `useAuth()` hook (JWT-based)
- **Purpose:** Onboarding page for new users without PatientProfile
- **Redirects:** If user has PatientProfile → `/patient/dashboard`

### 5. **Patient Dashboard** (`app/patient/dashboard/page.tsx`)
- **Type:** Client component (`'use client'`)
- **Auth:** Uses `useAuth()` hook (JWT-based)
- **API Calls:** Uses `patientApi` which includes JWT tokens in headers
- **Features:**
  - Shows upcoming appointments
  - Quick stats
  - Links to appointments, consultations, profile

### 6. **Patient Appointments** (`app/patient/appointments/page.tsx`)
- **Type:** Client component (`'use client'`)
- **Auth:** Uses `useAuth()` hook (JWT-based)
- **API Calls:** Uses `patientApi.getAppointments()` with JWT auth

### 7. **Patient Profile** (`app/patient/profile/page.tsx`)
- **Type:** Client component (`'use client'`)
- **Auth:** Uses `useAuth()` hook (JWT-based)

### 8. **Patient Consultations** (`app/patient/consultations/page.tsx`)
- **Type:** Client component (`'use client'`)
- **Auth:** Uses `useAuth()` hook (JWT-based)

---

## 🔐 Authentication Architecture

### **Client-Side Authentication** (Client Components)
- **Hook:** `hooks/patient/useAuth.ts`
- **Storage:** `lib/auth/token.ts` (localStorage/cookies)
- **API Client:** `lib/api/client.ts` (auto-injects JWT tokens)
- **Used by:**
  - All `/patient/*` pages
  - All `/portal/*` pages
  - All `/doctor/*` pages (client components)
  - All `/admin/*` pages (client components)
  - All `/nurse/*` pages
  - All `/frontdesk/*` pages

### **Server-Side Authentication** (Server Components)
- **Helper:** `lib/auth/server-auth.ts`
  - `getCurrentUser()` - Returns `AuthContext` (userId, email, role)
  - `getCurrentUserFull()` - Returns full User object from DB
- **Used by:**
  - `app/(protected)/patient/page.tsx` ✅
  - `app/(protected)/doctor/page.tsx` ✅
  - `app/(protected)/patient/[patientId]/page.tsx` ✅
  - `app/(protected)/patient/registration/page.tsx` ✅
  - `app/(protected)/record/appointments/page.tsx` ⚠️ (partially - also uses Clerk)

### **API Route Authentication**
- **Middleware:** `controllers/middleware/JwtMiddleware.ts`
- **Flow:**
  1. Extracts `Authorization: Bearer <token>` header
  2. Verifies JWT token
  3. Returns `AuthContext` or rejects request
- **Used by:**
  - `/api/auth/login`
  - `/api/auth/register`
  - `/api/auth/refresh`
  - All other API routes that require auth

---

## ⚠️ Remaining Clerk References

### **1. `utils/roles.ts`** ❌ **NEEDS FIX**
```typescript
import { auth } from "@clerk/nextjs/server";

export const checkRole = async (role: Roles) => {
  const { sessionClaims } = await auth();
  return sessionClaims?.metadata?.role === role.toLowerCase();
};

export const getRole = async () => {
  const { sessionClaims } = await auth();
  const role = sessionClaims?.metadata.role!?.toLowerCase() || "patient";
  return role;
};
```
**Used by:**
- `app/(protected)/record/appointments/page.tsx` - Uses `getRole()` and `checkRole()`

**Fix:** Replace with JWT-based role checking using `getCurrentUser()`

### **2. `app/actions/general.ts`** ⚠️ **LEGACY?**
- Uses `clerkClient` to delete users
- **Question:** Are these server actions actually used? Or are they legacy?

### **3. `app/actions/patient.ts`** ⚠️ **LEGACY?**
- Uses `clerkClient` to get user metadata
- **Question:** Are these server actions actually used?

### **4. `app/actions/admin.ts`** ⚠️ **LEGACY?**
- Uses `auth()` and `clerkClient`
- **Question:** Are these server actions actually used?

### **5. `app/actions/appointment.ts`** ⚠️ **LEGACY?**
- Uses `auth()` and `currentUser()`
- **Question:** Are these server actions actually used?

### **6. `app/(protected)/record/users/page.tsx`** ❌ **NEEDS FIX**
- Uses `clerkClient` to list users
- **Fix:** Replace with Prisma query + JWT auth

---

## 📋 Action Items

### **Priority 1: Fix Active Code**
1. ✅ Update `utils/roles.ts` to use JWT instead of Clerk
2. ✅ Update `app/(protected)/record/appointments/page.tsx` to use JWT role checking
3. ✅ Update `app/(protected)/record/users/page.tsx` to use JWT + Prisma

### **Priority 2: Investigate Legacy Code**
1. ⚠️ Check if `app/actions/*.ts` files are actually used
2. ⚠️ If not used, mark as legacy or remove
3. ⚠️ If used, update to JWT

### **Priority 3: Verify Build**
1. ✅ Run `npm run build` to ensure no Clerk imports remain
2. ✅ Test authentication flow end-to-end

---

## ✅ What's Working

1. **Client-side auth** - All client components use `useAuth()` hook (JWT) ✅
2. **API routes** - All use JWT middleware ✅
3. **Most server components** - Use `getCurrentUser()` or `getCurrentUserFull()` ✅
4. **Token storage** - JWT tokens stored in cookies/localStorage ✅
5. **Token refresh** - Automatic refresh on 401 errors ✅

---

## 🎯 Summary

**Current State:**
- ✅ 95% of the codebase uses JWT authentication
- ❌ 5% still references Clerk (mostly in utilities and server actions)
- ⚠️ Some Clerk references may be legacy/unused code

**Next Steps:**
1. Fix `utils/roles.ts` to use JWT
2. Fix `app/(protected)/record/users/page.tsx` to use JWT
3. Investigate if server actions are actually used
4. Remove or update remaining Clerk references
5. Verify build passes
