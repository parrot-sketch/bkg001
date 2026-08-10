'use client';

import { UnifiedHeader } from '@/components/shared/UnifiedHeader';
import { useAuth } from '@/hooks/patient/useAuth';

interface FrontdeskHeaderProps {
  onMenuClick?: () => void;
}

const ROLE_CONFIG: Record<string, { roleName: string; roleLabel: string; roleBadgeCls: string; profileHref: string; rootHref: string }> = {
  FRONTDESK: {
    roleName: 'Front Desk',
    roleLabel: 'Front Desk',
    roleBadgeCls: 'bg-[#DFAC0D] text-[#9a7709] border border-[#DFAC0D]/30',
    profileHref: '/frontdesk/profile',
    rootHref: '/frontdesk/dashboard',
  },
  NURSE: {
    roleName: 'Nurse',
    roleLabel: 'Nurse',
    roleBadgeCls: 'bg-emerald-500/10 text-emerald-700 border border-emerald-200',
    profileHref: '/nurse/profile',
    rootHref: '/nurse/dashboard',
  },
  ADMIN: {
    roleName: 'Admin',
    roleLabel: 'Admin',
    roleBadgeCls: 'bg-[#2c2e4b]/10 text-[#2c2e4b] border border-[#2c2e4b]/20',
    profileHref: '/admin/profile',
    rootHref: '/admin/dashboard',
  },
};

export function FrontdeskHeader({ onMenuClick }: FrontdeskHeaderProps) {
  const { user } = useAuth();
  const role = user?.role || 'FRONTDESK';
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.FRONTDESK;

  return (
    <UnifiedHeader
      roleName={config.roleName}
      roleLabel={config.roleLabel}
      roleBadgeCls={config.roleBadgeCls}
      profileHref={config.profileHref}
      rootHref={config.rootHref}
      onMenuClick={onMenuClick}
      searchPlaceholder="Search patients…"
    />
  );
}
