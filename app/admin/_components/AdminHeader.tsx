'use client';
import { UnifiedHeader } from '@/components/shared/UnifiedHeader';
interface AdminHeaderProps {
  onMenuClick?: () => void;
}
export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  return (
    <UnifiedHeader
      roleName="Admin"
      roleLabel="Admin"
      roleBadgeCls="bg-blue-500/10 text-blue-700"
      profileHref="/admin/profile"
      rootHref="/admin/dashboard"
      searchPlaceholder="Search…"
      onMenuClick={onMenuClick}
    />
  );
}
