'use client';

/**
 * Admin profile & account management.
 * Shared staff surface: profile, password, email, sign-out.
 */

import { StaffAccountProfile } from '@/components/account/StaffAccountProfile';

export default function AdminProfilePage() {
  return (
    <div className="mx-auto max-w-3xl px-1 pb-10 sm:px-0">
      <StaffAccountProfile
        title="Your account"
        subtitle="Update how you appear in the clinic, and change the password you use to sign in."
      />
    </div>
  );
}
