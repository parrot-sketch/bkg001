# Seeding Real Nairobi Sculpt Services

## Overview

This guide explains how to seed the real services from [Nairobi Sculpt's website](https://www.nairobisculpt.com/services.html) into the database for use in consultation booking.

## Services Data Source

Services are extracted from: **https://www.nairobisculpt.com/services.html**

**Categories:**
- **Facial Procedures**: Facelift, Rhinoplasty, Blepharoplasty, Brow Lift, Chin Augmentation, Otoplasty
- **Body Procedures**: Liposuction, Brazilian Butt Lift, Tummy Tuck
- **Breast Procedures**: Breast Augmentation, Breast Lift, Breast Reduction, Male Gynecomastia
- **Skin and Scar Treatments**: Scar Management, Keloid Treatment, Scar Revision, Advanced Wound Care
- **Non-Surgical Treatments**: Botox, Dermal Fillers
- **Consultation**: Initial Consultation, Follow-up Consultation

## Running the Seed Script

```bash
# Run the services seed script
npx tsx scripts/seed-services.ts

# Or add to package.json and run:
npm run seed:services
```

## What the Script Does

1. **Extracts real services** from Nairobi Sculpt's service page structure
2. **Creates or updates** services in the database
3. **Sets correct categories** (Procedure, Treatment, Consultation)
4. **Activates all services** (`is_active = true`)
5. **Preserves existing prices** if services already exist

## Non-Blocking User Experience

**How we prevent blocking:**

1. **Parallel Loading**: Services and doctors fetch simultaneously in background
2. **Progressive Enhancement**: User can start Step 1 immediately while Step 2 data loads
3. **Graceful Loading States**: Step 2 shows spinner while loading, not blocking entire page
4. **Fallback UI**: If services fail to load, shows helpful message instead of breaking

**User Flow:**
- ✅ User lands on Step 1 → Can start filling immediately
- ✅ Services load in background → No blocking
- ✅ User reaches Step 2 → If services loaded, shows them; if not, shows loading spinner
- ✅ User can't proceed to Step 3 until Step 2 is complete anyway → Loading completes in time

## Updating Services

If Nairobi Sculpt adds new services:

1. Update `scripts/seed-services.ts` with new services
2. Run seed script again (it will update existing, create new)
3. Services automatically appear in booking form

## Database Schema

Services are stored in `Service` model:

```prisma
model Service {
  id           Int     @id @default(autoincrement())
  service_name String
  description  String?
  price        Float
  category     String? // Procedure, Treatment, Consultation
  is_active    Boolean @default(true)
}
```

## API Endpoint

Services are fetched via:
- **GET** `/api/services`
- Returns only `is_active = true` services
- Public endpoint (no auth required)
- Used by booking form Step 2
