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
      {/* ── Card ───────────────────────────────────────────────────── */}
      <div className="relative w-full max-w-md">
        {/* Brand Title Only */}
        <div className="flex items-center justify-center mb-8">
          <span className="font-semibold text-2xl text-slate-900 tracking-tight">
            Nairobi Sculpt
          </span>
        </div>

        {/* Standard flat card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 sm:p-10">
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
