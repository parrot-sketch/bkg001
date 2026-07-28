'use client';
import { UnifiedHeader } from '@/components/shared/UnifiedHeader';
interface TheaterTechHeaderProps { onMenuClick?: () => void; }
export function TheaterTechHeader({ onMenuClick }: TheaterTechHeaderProps) {
  return (
    <UnifiedHeader
      roleName="Theater Tech"
      roleLabel="Theater Tech"
      roleBadgeCls="bg-cyan-500/10 text-cyan-700"
      profileHref="/theater-tech/profile"
      rootHref="/theater-tech/dashboard"
      onMenuClick={onMenuClick}
      searchPlaceholder="Search cases…"
    />
  );
}
