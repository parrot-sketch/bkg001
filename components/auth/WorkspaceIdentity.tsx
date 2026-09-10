'use client';

interface WorkspaceIdentityProps {
  title?: string;
}

/** Logo only on the auth form panel — no frame or marketing copy. */
export function WorkspaceIdentity({ title = 'Nairobi Sculpt' }: WorkspaceIdentityProps) {
  return (
    <img
      src="/logo.png"
      alt={title}
      className="h-14 w-auto object-contain sm:h-16"
    />
  );
}
