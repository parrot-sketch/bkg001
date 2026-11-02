'use client';

/**
 * Frontdesk profile & account management.
 * Uses the shared staff account surface (profile, password, email, sign-out).
 */

import { StaffAccountProfile } from '@/components/account/StaffAccountProfile';

export default function FrontdeskProfilePage() {
  return (
    <div className="px-3 pb-10 pt-14 sm:px-4 lg:px-0 lg:pt-0">
      <StaffAccountProfile
        title="Your account"
        subtitle="Update how you appear on the desk, and change the password you use to sign in."
      />
    </div>
  );
}
