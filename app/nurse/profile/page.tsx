'use client';

/**
 * Nurse profile & account management.
 * Shared staff surface: profile, password, email, sign-out.
 */

import { StaffAccountProfile } from '@/components/account/StaffAccountProfile';

export default function NurseProfilePage() {
  return (
    <div className="mx-auto max-w-3xl px-1 pb-10 sm:px-0">
      <StaffAccountProfile
        title="Your account"
        subtitle="Update your name and phone, and change the password you use to sign in."
      />
    </div>
  );
}
