'use client';
import { UnifiedHeader } from '@/components/shared/UnifiedHeader';
interface NurseHeaderProps { onMenuClick?: () => void; }
export function NurseHeader({ onMenuClick }: NurseHeaderProps) {
  return (
    <UnifiedHeader
      roleName="Nurse"
      roleLabel="Nurse"
      roleBadgeCls="bg-emerald-500/10 text-emerald-700"
      profileHref="/nurse/profile"
      onMenuClick={onMenuClick}
      searchPlaceholder="Search patients…"
    />
  );
}
