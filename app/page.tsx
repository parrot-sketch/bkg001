'use client';

/**
 * Landing Page — Nairobi Sculpt Aesthetic Centre
 * 
 * Version switcher that allows choosing between:
 * - Version 1: Original design (clean, minimal)
 * - Version 2: Premium graphics (enhanced visuals, animations)
 * 
 * Switch versions via:
 * - URL query: ?version=1 or ?version=2
 * - Environment variable: NEXT_PUBLIC_LANDING_VERSION=1 or 2
 * - Default: Version 2 (premium graphics)
 */

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getLandingVersion } from '@/lib/landing/version-switcher';
import LandingPageV1 from './landing/v1/LandingPageV1';
import LandingPageV2 from './landing/v2/LandingPageV2';

/* ================================================================== */
/* VERSION SWITCHER                                                    */
/* ================================================================== */
function LandingPageSwitcher() {
  const searchParams = useSearchParams();
  const version = getLandingVersion({ version: searchParams?.get('version') || undefined });

  // Render the appropriate version
  if (version === '1') {
    return <LandingPageV1 />;
  }

  // Default to version 2 (premium graphics)
  return <LandingPageV2 />;
}

/* ================================================================== */
/* MAIN PAGE                                                           */
/* ================================================================== */
export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><div className="text-slate-500">Loading...</div></div>}>
      <LandingPageSwitcher />
    </Suspense>
  );
}
