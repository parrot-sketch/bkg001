import React, { Suspense } from 'react';

/**
 * Auth Layout — Nairobi Sculpt
 *
 * Design spec compliance:
 * - Mobile-first: 16px padding on mobile → centred card on ≥ 640px
 * - No horizontal scroll
 * - Accessible: landmark <main>, skip-link compatible
 * - Subtle brand personality: warm cream gradient + navy accent stripe
 * - Card: white, rounded-2xl, shadow-md, max-w-md
 * - Typography: Inter (loaded globally)
 */

export const metadata = {
  title: 'Sign In — Nairobi Sculpt',
  description: 'Sign in to the Nairobi Sculpt clinical management system.',
};

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    /**
     * Full-viewport wrapper with layered gradient background.
     * from-brand-isabelline/60 → white → brand-powder/15 gives the warm,
     * premium feel without competing with the card content.
     */
    <div className="relative min-h-screen flex flex-col bg-gradient-to-br from-brand-isabelline/60 via-white to-brand-powder/20 overflow-x-hidden">

      {/* ── Top accent bar ─────────────────────────────────────────────────── */}
      {/* 4px brand-primary stripe at the very top — subtle but professional */}
      <div className="h-1 w-full bg-brand-primary shrink-0" aria-hidden="true" />

      {/* ── Background decorative circles (large screens only) ─────────────── */}
      <div className="pointer-events-none select-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full bg-brand-primary/4 blur-3xl hidden lg:block" />
        <div className="absolute -bottom-40 -left-40 w-[480px] h-[480px] rounded-full bg-brand-powder/30 blur-3xl hidden lg:block" />
      </div>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main
        id="main-content"
        className="flex-1 flex flex-col items-center justify-center px-4 py-10 sm:py-16"
        aria-label="Sign in"
      >
        <div className="w-full max-w-md">

          {/* Brand wordmark */}
          <div className="flex flex-col items-center mb-8 gap-1">
            {/* Replace with <Image> if you have an SVG logo */}
            <span className="text-[22px] font-bold text-brand-primary tracking-tight leading-none">
              Nairobi Sculpt
            </span>
            <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400 font-medium">
              Aesthetic Centre
            </span>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-900/6 px-6 py-8 sm:px-10 sm:py-10">
            {/* Wrap in Suspense so page.tsx can safely use useSearchParams() */}
            <Suspense fallback={null}>
              {children}
            </Suspense>
          </div>

          {/* Footer */}
          <p className="text-center text-[11px] text-slate-400 mt-6 px-4">
            © {new Date().getFullYear()} Nairobi Sculpt Aesthetic Centre · All rights reserved
          </p>
        </div>
      </main>
    </div>
  );
};

export default AuthLayout;
