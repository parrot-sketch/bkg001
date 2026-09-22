'use client';

import Image from 'next/image';
import { CSSProperties, ReactNode } from 'react';

interface AuthShellProps {
  children: ReactNode;
}

const authThemeVars = {
  '--auth-navy': '#102F52',
  '--auth-navy-deep': '#0A1F38',
  '--auth-ink': '#2c2e4b',
  '--auth-gold': '#caa26a',
  '--auth-gold-bright': '#C7A45D',
} as CSSProperties;

export function AuthShell({ children }: AuthShellProps) {
  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={authThemeVars}
    >
      <Image
        src="/bg.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
        aria-hidden="true"
      />

      {/* Official navy wash — keeps brand readable over photography */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(160deg,rgba(10,31,56,0.94)_0%,rgba(16,47,82,0.88)_42%,rgba(44,46,75,0.9)_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(202,162,106,0.14),transparent_55%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        }}
      />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-5 py-12 sm:px-8">
        {children}
      </div>
    </main>
  );
}
