'use client';
import { UnifiedHeader } from '@/components/shared/UnifiedHeader';
interface FrontdeskHeaderProps { onMenuClick?: () => void; }
export function FrontdeskHeader({ onMenuClick }: FrontdeskHeaderProps) {
  return (
    <UnifiedHeader
      roleName="Front Desk"
      roleLabel="Front Desk"
      roleBadgeCls="bg-amber-500/10 text-amber-700"
      profileHref="/frontdesk/profile"
      onMenuClick={onMenuClick}
      searchPlaceholder="Search patients…"
    />
  );
}
