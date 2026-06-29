import React, { Suspense } from 'react';

/**
 * Auth Layout — Nairobi Sculpt
 *
 * Split-screen design spec compliance:
 * - Desktop & up: Split-screen with branded left panel and auth panel on right
 * - Mobile: Full-screen auth panel
 * - WCAG AA: Proper color contrast, focus indicators, semantic landmarks
 * - Design tokens: nairobi brand colors
 * - 8px spacing grid throughout
 */

export const metadata = {
  title: 'Sign In — Nairobi Sculpt',
  description: 'Sign in to the Nairobi Sculpt clinical management system.',
};

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="relative min-h-screen flex flex-col lg:flex-row overflow-x-hidden bg-slate-50">

      {/* ── Branded Left Panel (Desktop+) ───────────────────────────────────────── */}
      <aside
        className="hidden lg:flex lg:relative lg:w-5/12 xl:w-1/2 flex-col items-center justify-center p-12 xl:p-16"
        aria-label="Brand information"
      >
        {/* Background with brand teal */}
        <div className="absolute inset-0 bg-[#0c5d69]" aria-hidden="true" />
        
        {/* Brand content */}
        <div className="relative z-10 w-full max-w-sm space-y-8">
          {/* Logo and Brand */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-sm">
              <img 
                src="/logo.png" 
                alt="Nairobi Sculpt Logo" 
                className="w-14 h-14 object-contain"
              />
            </div>
            
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-white tracking-tight" style={{fontFamily: 'var(--font-playfair), Georgia, serif'}}>
                Nairobi Sculpt
              </h1>
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/70 font-medium">
                Aesthetic Centre
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Auth Panel (Right) ────────────────────────────────────────────────── */}
      <main
        id="main-content"
        className="relative flex-1 flex flex-col items-center justify-center px-6 py-12 sm:px-12 lg:w-7/12 xl:w-1/2 lg:px-20 lg:py-16"
        aria-label="Authentication"
      >
        {/* Wrap in Suspense so page.tsx can safely use useSearchParams() */}
        <Suspense fallback={null}>
          {children}
        </Suspense>
      </main>
    </div>
  );
};

export default AuthLayout;