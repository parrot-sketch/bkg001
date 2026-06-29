'use client';

import { UnifiedHeader } from '@/components/shared/UnifiedHeader';

interface FrontdeskHeaderProps {
  onMenuClick?: () => void;
}

/**
 * FrontdeskHeader — Nairobi Sculpt Brand
 *
 * Role badge uses brand gold (#DFAC0D) tones to distinguish the
 * Frontdesk role clearly without the off-brand amber default.
 */
export function FrontdeskHeader({ onMenuClick }: FrontdeskHeaderProps) {
  return (
    <UnifiedHeader
      roleName="Front Desk"
      roleLabel="Front Desk"
      roleBadgeCls="bg-[#DFAC0D] text-[#9a7709] border border-[#DFAC0D]/30"
      profileHref="/frontdesk/profile"
      onMenuClick={onMenuClick}
      searchPlaceholder="Search patients…"
    />
  );
}
