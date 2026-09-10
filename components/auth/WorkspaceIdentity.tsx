'use client';

interface WorkspaceIdentityProps {
  title?: string;
  description?: string;
}

export function WorkspaceIdentity({
  title = 'Nairobi Sculpt',
  description = 'Clinical Workspace',
}: WorkspaceIdentityProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <div className="flex h-[84px] w-[84px] shrink-0 items-center justify-center rounded-2xl border border-[#E2E7EC] bg-white p-2 shadow-[0_12px_30px_-18px_rgba(16,47,82,0.45)]">
          <img
            src="/logo.png"
            alt={title}
            className="h-full w-full object-contain"
          />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8A96A4]">
            Staff access
          </p>
          <h1 className="mt-1 text-[23px] font-semibold tracking-[-0.025em] text-[#102F52]">
            {title}
          </h1>
          <p className="mt-1 text-[13px] font-medium text-[#718096]">
            {description}
          </p>
        </div>
      </div>

      <div className="border-l-2 border-[#C7A45D] pl-4">
        <p className="text-[15px] font-medium leading-6 text-[#334155]">
          A focused workspace for confident, connected care.
        </p>
        <p className="mt-1.5 text-[12px] leading-5 text-[#8A96A4]">
          Sign in to continue to your clinical dashboard.
        </p>
      </div>
    </div>
  );
}
