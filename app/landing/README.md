# Landing Page Versions

This directory contains different versions of the landing page, allowing you to switch between designs.

## Available Versions

### Version 1 (Original)
- **Location**: `app/landing/v1/LandingPageV1.tsx`
- **Description**: Original clean, minimal design with balanced typography and scroll-reveal animations
- **Features**:
  - Simple gradient backgrounds
  - Dot grid textures
  - Basic radial glow effects
  - Clean, professional aesthetic

### Version 2 (Premium Graphics)
- **Location**: `app/landing/v2/LandingPageV2.tsx`
- **Description**: Enhanced version with premium visual graphics and lively animations
- **Features**:
  - Floating particles
  - Animated gradient orbs
  - Premium medical/aesthetic icons
  - Enhanced hover effects
  - Wave patterns
  - Decorative elements
  - Card glow effects

## How to Switch Versions

### Method 1: URL Query Parameter (Recommended for Testing)
Add `?version=1` or `?version=2` to the URL:
- Version 1: `http://localhost:3000/?version=1`
- Version 2: `http://localhost:3000/?version=2`
- Default (V2): `http://localhost:3000/`

### Method 2: Environment Variable (For Production)
Set the `NEXT_PUBLIC_LANDING_VERSION` environment variable in your `.env` file:

```bash
# Use Version 1
NEXT_PUBLIC_LANDING_VERSION=1

# Use Version 2 (default)
NEXT_PUBLIC_LANDING_VERSION=2
```

**Priority Order:**
1. URL query parameter (`?version=1` or `?version=2`)
2. Environment variable (`NEXT_PUBLIC_LANDING_VERSION`)
3. Default (Version 2 - Premium Graphics)

## File Structure

```
app/
├── page.tsx                    # Main entry point with version switcher
├── landing/
│   ├── README.md              # This file
│   ├── v1/
│   │   └── LandingPageV1.tsx  # Original version
│   └── v2/
│       └── LandingPageV2.tsx  # Premium graphics version
└── components/
    └── landing/
        └── PremiumGraphics.tsx # Premium graphics components (used by V2)
```

## Version Switcher Logic

The version switcher (`lib/landing/version-switcher.ts`) determines which version to display based on:
1. URL query parameters (highest priority)
2. Environment variables
3. Default fallback (Version 2)

## Making Changes

- **To modify Version 1**: Edit `app/landing/v1/LandingPageV1.tsx`
- **To modify Version 2**: Edit `app/landing/v2/LandingPageV2.tsx`
- **To add new premium graphics**: Edit `components/landing/PremiumGraphics.tsx`

## Notes

- Both versions share the same core functionality and data fetching
- Version 2 uses additional premium graphics components from `components/landing/PremiumGraphics.tsx`
- The version switcher is client-side only (uses `useSearchParams` from Next.js)
- Default version is Version 2 (premium graphics) if no preference is specified
