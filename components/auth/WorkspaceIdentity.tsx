'use client';

interface WorkspaceIdentityProps {
  title?: string;
  subtitle?: string;
}

/** Form-panel heading — brand lockup lives in AuthBrandPanel. */
export function WorkspaceIdentity({
  title = 'Staff sign-in',
  subtitle = 'Enter your clinic credentials to continue.',
}: WorkspaceIdentityProps) {
  return (
    <div className="border-b border-[#E8E4DC] pb-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#caa26a]">
        Authorised access
      </p>
      <h2 className="mt-2 font-[family-name:var(--font-playfair)] text-[1.65rem] font-semibold leading-tight tracking-[-0.02em] text-[#102F52]">
        {title}
      </h2>
      <p className="mt-1.5 text-[13.5px] leading-5 text-[#5A6675]">{subtitle}</p>
    </div>
  );
}
