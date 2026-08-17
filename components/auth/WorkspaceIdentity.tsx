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
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg">
          <img
            src="/nsac.png"
            alt={title}
            className="h-160 w-160 object-contain"
          />
        </div>
        <h1 className="text-[15px] font-semibold tracking-[-0.01em] text-[#102F52]">
          {title}
        </h1>
      </div>

    </div>
  );
}
