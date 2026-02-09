import React from "react";
import Image from "next/image";
import Link from "next/link";

/**
 * Auth Layout
 *
 * Premium authentication layout matching the landing-page design language:
 * layered CSS backgrounds, frosted-glass card, and brand-aligned typography.
 * Distraction-free, centered, high-trust.
 */
const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden bg-gradient-to-br from-brand-isabelline/50 via-white to-brand-powder/20">
      {/* ── Background layers (same system as landing page) ────────── */}
      <div className="absolute inset-0 dot-grid-overlay mask-fade-bottom" />
      <div className="absolute inset-0 radial-glow-top-right opacity-25" />
      <div className="absolute inset-0 radial-glow-bottom-left opacity-25" />

      {/* Floating soft blobs */}
      <div className="absolute top-10 right-[-6%] w-[380px] h-[380px] bg-brand-powder/20 rounded-full blur-3xl animate-landing-float-slow pointer-events-none" />
      <div className="absolute bottom-0 left-[-4%] w-[280px] h-[280px] bg-brand-secondary/8 rounded-full blur-3xl animate-landing-float pointer-events-none" />

      {/* ── Card ───────────────────────────────────────────────────── */}
      <div className="relative w-full max-w-md">
        {/* Logo + Brand */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/logo.png"
              alt="Nairobi Sculpt Logo"
              width={36}
              height={36}
              className="h-9 w-auto object-contain group-hover:scale-105 transition-transform"
              priority
            />
            <span className="font-semibold text-lg text-slate-900 tracking-tight">
              Nairobi Sculpt
            </span>
          </Link>
        </div>

        {/* Frosted glass card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-xl shadow-slate-900/5 p-8 sm:p-10">
          {children}
        </div>

        {/* Subtle footer */}
        <p className="text-center text-[11px] text-slate-400 mt-8">
          © {new Date().getFullYear()} Nairobi Sculpt Aesthetic Centre
        </p>
      </div>
    </div>
  );
};

export default AuthLayout;
