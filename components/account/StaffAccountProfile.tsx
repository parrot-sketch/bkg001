'use client';

/**
 * Staff account & profile management
 *
 * Shared surface for desk roles. Frontdesk first; other roles can reuse.
 * - Profile: first name, last name, phone via PUT /api/users/me
 * - Password: PUT /api/account/password (revokes refresh sessions → re-login)
 * - Email: PUT /api/account/email (requires password → re-login)
 */

import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Eye, EyeOff, KeyRound, Loader2, Mail, Shield, UserRound } from 'lucide-react';

import { useAuth } from '@/hooks/patient/useAuth';
import { apiClient } from '@/lib/api/client';
import { authApi } from '@/lib/api/auth';
import { tokenStorage, type StoredUser } from '@/lib/auth/token';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type ProfileData = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  role: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

const ROLE_LABELS: Record<string, string> = {
  FRONTDESK: 'Front desk',
  NURSE: 'Nurse',
  DOCTOR: 'Doctor',
  ADMIN: 'Administrator',
  THEATER_TECHNICIAN: 'Theater technician',
  STORES: 'Stores',
  PATIENT: 'Patient',
};

function roleLabel(role: string) {
  return ROLE_LABELS[role] ?? role.replace(/_/g, ' ').toLowerCase();
}

function passwordIssues(password: string): string[] {
  const issues: string[] = [];
  if (password.length < 8) issues.push('at least 8 characters');
  if (!/[A-Z]/.test(password)) issues.push('one uppercase letter');
  if (!/[a-z]/.test(password)) issues.push('one lowercase letter');
  if (!/[0-9]/.test(password)) issues.push('one number');
  return issues;
}

async function signOutToLogin(message: string) {
  toast.success(message);
  try {
    await authApi.logout();
  } catch {
    // Local clear still proceeds
  }
  tokenStorage.clear();
  // Brief delay so the success toast is visible before navigation.
  window.setTimeout(() => {
    window.location.href = '/login';
  }, 600);
}

export function StaffAccountProfile({
  title = 'Account',
  subtitle = 'Your profile and sign-in details for this clinic.',
}: {
  title?: string;
  subtitle?: string;
}) {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      setLoadingProfile(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadingProfile(true);
      setLoadError(null);
      try {
        const res = await apiClient.get<ProfileData>('/users/me');
        if (cancelled) return;
        if (!res.success) {
          setLoadError(res.error || 'Could not load your profile.');
          // Fall back to auth cache so the page is still usable
          setProfile({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            role: user.role,
            status: 'ACTIVE',
          });
          setFirstName(user.firstName || '');
          setLastName(user.lastName || '');
          setPhone(user.phone || '');
          return;
        }
        setProfile(res.data);
        setFirstName(res.data.firstName || '');
        setLastName(res.data.lastName || '');
        setPhone(res.data.phone || '');
      } catch {
        if (!cancelled) setLoadError('Could not load your profile.');
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, user]);

  if (authLoading || loadingProfile) {
    return (
      <div className="mx-auto max-w-3xl bg-white px-6 py-16 text-sm text-[#2c2e4b]/70">
        <Loader2 className="mb-3 h-5 w-5 animate-spin text-[#005f73]" />
        Loading your account…
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="mx-auto max-w-3xl bg-white px-6 py-16 text-center text-sm text-[#2c2e4b]">
        Sign in to manage your account.
      </div>
    );
  }

  const display = profile ?? {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role,
    status: 'ACTIVE',
  };

  const profileDirty =
    firstName.trim() !== (display.firstName || '') ||
    lastName.trim() !== (display.lastName || '') ||
    phone.trim() !== (display.phone || '');

  async function saveProfile() {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First and last name are required.');
      return;
    }
    setSavingProfile(true);
    try {
      const res = await apiClient.put<ProfileData>('/users/me', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || null,
      });
      if (!res.success) {
        toast.error(res.error || 'Could not save profile.');
        return;
      }
      setProfile(res.data);
      const next: StoredUser = {
        id: res.data.id,
        email: res.data.email,
        role: res.data.role,
        firstName: res.data.firstName ?? undefined,
        lastName: res.data.lastName ?? undefined,
        phone: res.data.phone ?? undefined,
      };
      tokenStorage.setUser(next);
      toast.success('Profile saved.');
      // Reload so header / auth context pick up the new display name.
      window.location.reload();
    } catch {
      toast.error('Could not save profile.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword() {
    const issues = passwordIssues(newPassword);
    if (issues.length) {
      toast.error(`New password needs ${issues.join(', ')}.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match.');
      return;
    }
    if (!currentPassword) {
      toast.error('Enter your current password.');
      return;
    }
    setSavingPassword(true);
    try {
      const res = await apiClient.put('/account/password', {
        currentPassword,
        newPassword,
      });
      if (!res.success) {
        toast.error(res.error || 'Could not update password.');
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // Refresh tokens are revoked server-side — require a clean sign-in.
      await signOutToLogin('Password updated. Sign in with your new password.');
    } catch {
      toast.error('Could not update password.');
    } finally {
      setSavingPassword(false);
    }
  }

  async function saveEmail() {
    if (!newEmail.trim() || !emailPassword) {
      toast.error('Enter the new email and your current password.');
      return;
    }
    setSavingEmail(true);
    try {
      const res = await apiClient.put('/account/email', {
        newEmail: newEmail.trim(),
        currentPassword: emailPassword,
      });
      if (!res.success) {
        toast.error(res.error || 'Could not update email.');
        return;
      }
      await signOutToLogin('Email updated. Sign in with your new email.');
    } catch {
      toast.error('Could not update email.');
    } finally {
      setSavingEmail(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl bg-white text-[#2c2e4b]">
      <header className="border-b border-[#e7d6bf] bg-[#2c2e4b] px-5 py-6 text-white sm:px-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#caa26a]">
          {roleLabel(display.role)}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 max-w-xl text-sm text-white/70">{subtitle}</p>
      </header>

      <div className="grid grid-cols-2 gap-px border-b border-[#e7d6bf] bg-[#e7d6bf] sm:grid-cols-4">
        <Fact label="Signed in as" value={display.email} />
        <Fact label="Role" value={roleLabel(display.role)} />
        <Fact label="Status" value={display.status === 'ACTIVE' ? 'Active' : display.status} />
        <Fact
          label="Name"
          value={[display.firstName, display.lastName].filter(Boolean).join(' ') || '—'}
        />
      </div>

      {loadError && (
        <p className="border-b border-[#e7d6bf] bg-[#e7d6bf]/30 px-5 py-3 text-sm text-[#9b2226] sm:px-8">
          {loadError} Showing details from your current session.
        </p>
      )}

      <section className="border-b border-[#e7d6bf] px-5 py-6 sm:px-8">
        <SectionHeading
          icon={<UserRound className="h-4 w-4" />}
          title="Profile"
          description="How your name and phone appear to colleagues on the desk."
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="First name" htmlFor="acct-first">
            <Input
              id="acct-first"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="rounded-none border-[#e7d6bf] focus-visible:ring-[#005f73]"
              autoComplete="given-name"
            />
          </Field>
          <Field label="Last name" htmlFor="acct-last">
            <Input
              id="acct-last"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="rounded-none border-[#e7d6bf] focus-visible:ring-[#005f73]"
              autoComplete="family-name"
            />
          </Field>
          <Field label="Phone" htmlFor="acct-phone" className="sm:col-span-2">
            <Input
              id="acct-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Optional"
              className="rounded-none border-[#e7d6bf] focus-visible:ring-[#005f73]"
              autoComplete="tel"
            />
          </Field>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            disabled={!profileDirty || savingProfile}
            onClick={() => void saveProfile()}
            className="rounded-none bg-[#003b53] hover:bg-[#005f73]"
          >
            {savingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save profile
          </Button>
          {profileDirty && (
            <button
              type="button"
              className="text-sm text-[#005f73] underline-offset-2 hover:underline"
              onClick={() => {
                setFirstName(display.firstName || '');
                setLastName(display.lastName || '');
                setPhone(display.phone || '');
              }}
            >
              Discard changes
            </button>
          )}
        </div>
      </section>

      <section className="border-b border-[#e7d6bf] px-5 py-6 sm:px-8">
        <SectionHeading
          icon={<KeyRound className="h-4 w-4" />}
          title="Password"
          description="If you signed in with a temporary password, set a personal one here. You will be asked to sign in again."
        />
        <div className="mt-5 space-y-4">
          <Field label="Current password" htmlFor="acct-cur-pw">
            <PasswordInput
              id="acct-cur-pw"
              value={currentPassword}
              onChange={setCurrentPassword}
              show={showCurrentPassword}
              onToggleShow={() => setShowCurrentPassword((v) => !v)}
              autoComplete="current-password"
            />
          </Field>
          <Field label="New password" htmlFor="acct-new-pw">
            <PasswordInput
              id="acct-new-pw"
              value={newPassword}
              onChange={setNewPassword}
              show={showNewPassword}
              onToggleShow={() => setShowNewPassword((v) => !v)}
              autoComplete="new-password"
            />
            <p className="mt-1.5 text-xs text-[#2c2e4b]/55">
              Use at least 8 characters with upper and lower case letters and a number.
            </p>
          </Field>
          <Field label="Confirm new password" htmlFor="acct-confirm-pw">
            <PasswordInput
              id="acct-confirm-pw"
              value={confirmPassword}
              onChange={setConfirmPassword}
              show={showConfirmPassword}
              onToggleShow={() => setShowConfirmPassword((v) => !v)}
              autoComplete="new-password"
            />
          </Field>
        </div>
        <div className="mt-5">
          <Button
            type="button"
            disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
            onClick={() => void savePassword()}
            className="rounded-none bg-[#003b53] hover:bg-[#005f73]"
          >
            {savingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Update password
          </Button>
        </div>
      </section>

      <section className="border-b border-[#e7d6bf] px-5 py-6 sm:px-8">
        <SectionHeading
          icon={<Mail className="h-4 w-4" />}
          title="Email"
          description="Changing your sign-in email requires your current password and signs you out."
        />
        <div className="mt-5 grid gap-4">
          <div className="border border-[#e7d6bf] bg-[#e7d6bf]/20 px-4 py-3 text-sm">
            Current email: <span className="font-medium">{display.email}</span>
          </div>
          <Field label="New email" htmlFor="acct-new-email">
            <Input
              id="acct-new-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="rounded-none border-[#e7d6bf] focus-visible:ring-[#005f73]"
              autoComplete="email"
            />
          </Field>
          <Field label="Current password" htmlFor="acct-email-pw">
            <PasswordInput
              id="acct-email-pw"
              value={emailPassword}
              onChange={setEmailPassword}
              show={showEmailPassword}
              onToggleShow={() => setShowEmailPassword((v) => !v)}
              autoComplete="current-password"
            />
          </Field>
        </div>
        <div className="mt-5">
          <Button
            type="button"
            variant="outline"
            disabled={savingEmail || !newEmail || !emailPassword}
            onClick={() => void saveEmail()}
            className="rounded-none border-[#2c2e4b] text-[#2c2e4b] hover:bg-[#e7d6bf]/40"
          >
            {savingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Update email
          </Button>
        </div>
      </section>

      <section className="px-5 py-6 sm:px-8">
        <SectionHeading
          icon={<Shield className="h-4 w-4" />}
          title="Session"
          description="Sign out of this browser when you leave the desk."
        />
        <Button
          type="button"
          variant="outline"
          className="mt-5 rounded-none border-[#9b2226] text-[#9b2226] hover:bg-[#9b2226]/10"
          onClick={() => void logout()}
        >
          Sign out
        </Button>
      </section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#e7d6bf]/40 px-4 py-3">
      <p className="text-[10px] uppercase tracking-wide text-[#2c2e4b]/55">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium text-[#2c2e4b]">{value}</p>
    </div>
  );
}

function SectionHeading({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border border-[#e7d6bf] bg-[#e7d6bf]/30 text-[#005f73]">
        {icon}
      </div>
      <div>
        <h2 className="text-base font-semibold text-[#2c2e4b]">{title}</h2>
        <p className="mt-0.5 text-sm text-[#2c2e4b]/60">{description}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor} className="text-xs font-medium text-[#2c2e4b]/70">
        {label}
      </Label>
      {children}
    </div>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  show,
  onToggleShow,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  autoComplete?: string;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-none border-[#e7d6bf] pr-11 focus-visible:ring-[#005f73]"
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={onToggleShow}
        className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center text-[#2c2e4b]/55 hover:text-[#2c2e4b]"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
