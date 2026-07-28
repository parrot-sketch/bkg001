'use client';
import { UnifiedHeader } from '@/components/shared/UnifiedHeader';

interface DoctorHeaderProps {
  onMenuClick?: () => void;
}

export function DoctorHeader({ onMenuClick }: DoctorHeaderProps) {
  return (
    <UnifiedHeader
      roleName="Doctor"
      roleLabel="Doctor"
      roleBadgeCls="bg-violet-500/10 text-violet-700"
      profileHref="/doctor/profile"
      rootHref="/doctor/dashboard"
      onMenuClick={onMenuClick}
      searchPlaceholder="Search patients…"
    />
  );
}
