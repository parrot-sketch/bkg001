'use client';

export function AuthBrandPanel() {
  const capabilities = [
    'Patient Management',
    'Clinical Documentation',
    'Care Coordination',
  ];

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden px-10 py-10 xl:px-16 xl:py-12">
      {/* Subtle background geometry */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-56 -top-56 h-[620px] w-[620px] rounded-full border border-white/[0.045]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-72 -left-64 h-[760px] w-[760px] rounded-full border border-white/[0.035]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[18%] top-[34%] h-px w-32 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent"
      />

      {/* Main brand message — centered in remaining space */}
      <div className="relative z-10 flex flex-1 items-center justify-center">
        <div className="max-w-md text-center">
          <div className="mb-6 flex items-center justify-center gap-3">
            <span className="h-px w-8 bg-[#C7A45D]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
              Clinical workspace
            </span>
            <span className="h-px w-8 bg-[#C7A45D]" />
          </div>

          <h1 className="text-[32px] font-semibold leading-[1.15] tracking-[-0.02em] text-white xl:text-[38px]">
            Clinical workflows.
            <br />
            <span className="text-white/55">Simplified.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-sm text-[14.5px] leading-6 text-white/60 xl:text-[15px]">
            Manage patients, consultations, clinical documentation and care
            workflows from one secure workspace.
          </p>

          {/* Capabilities */}
          <div className="mt-8 flex flex-col items-center gap-2.5">
            {capabilities.map((item) => (
              <div
                key={item}
                className="flex items-center gap-2.5 text-[13px] font-medium text-white/65"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#C7A45D]" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] text-white/35">
          Tibaflow · BKG Consulting Africa
        </p>
        <div className="flex items-center gap-2 text-[11px] text-white/40">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
          Secure clinical workspace
        </div>
      </footer>
    </div>
  );
}