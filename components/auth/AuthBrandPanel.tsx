'use client';

import Image from 'next/image';

/**
 * Hero brand lockup for the auth portal — brand first, not a side panel.
 */
export function AuthBrandPanel() {
  return (
    <header className="mx-auto w-full max-w-lg text-center animate-in fade-in slide-in-from-bottom-3 duration-700">
      <div className="mx-auto mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white/95 p-2 shadow-[0_0_0_1px_rgba(202,162,106,0.35),0_12px_40px_rgba(0,0,0,0.25)] sm:h-20 sm:w-20">
        <Image
          src="/logo.png"
          alt="Nairobi Sculpt"
          width={72}
          height={72}
          priority
          className="h-full w-full object-contain"
        />
      </div>

      <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--auth-gold-bright,#C7A45D)]">
        Nairobi Sculpt Aesthetic Centre
      </p>

      <h1
        className="mt-3 font-[family-name:var(--font-playfair)] text-[2.35rem] font-semibold leading-[1.05] tracking-[-0.02em] text-white sm:text-[2.85rem]"
      >
        Nairobi Sculpt
      </h1>

      <div
        aria-hidden="true"
        className="mx-auto mt-6 h-px w-24 origin-center scale-x-100 bg-gradient-to-r from-transparent via-[var(--auth-gold,#caa26a)] to-transparent animate-in fade-in zoom-in-95 duration-1000"
      />
    </header>
  );
}
