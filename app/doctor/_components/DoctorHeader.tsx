'use client';
import { UnifiedHeader } from '@/components/shared/UnifiedHeader';
export function DoctorHeader() {
  return (
    <UnifiedHeader
      roleName="Doctor"
      roleLabel="Doctor"
      roleBadgeCls="bg-violet-500/10 text-violet-700"
      profileHref="/doctor/profile"
      searchPlaceholder="Search patients…"
    />
  );
}
