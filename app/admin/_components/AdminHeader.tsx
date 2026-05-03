'use client';
import { UnifiedHeader } from '@/components/shared/UnifiedHeader';
export function AdminHeader() {
  return (
    <UnifiedHeader
      roleName="Admin"
      roleLabel="Admin"
      roleBadgeCls="bg-blue-500/10 text-blue-700"
      profileHref="/admin/profile"
      searchPlaceholder="Search…"
    />
  );
}
