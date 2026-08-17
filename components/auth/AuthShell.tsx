'use client';

import { ReactNode } from 'react';

interface AuthShellProps {
  brandPanel: ReactNode;
  authPanel: ReactNode;
}

export function AuthShell({ brandPanel, authPanel }: AuthShellProps) {
  return (
    <main className="min-h-screen bg-[#FCFCFA] lg:grid lg:grid-cols-[1.08fr_0.92fr]">
      {/* Brand / Product panel */}
      <section
        aria-label="Tibaflow"
        className="relative hidden min-h-screen overflow-hidden bg-[#102F52] lg:block"
      >
        {brandPanel}
      </section>

      {/* Authentication panel */}
      <section className="min-h-screen bg-[#FCFCFA]">
        {authPanel}
      </section>
    </main>
  );
}