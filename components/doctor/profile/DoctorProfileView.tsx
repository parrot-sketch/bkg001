'use client';

/**
 * Doctor Profile View
 *
 * Private self-service page: identity, schedule, fee, and sign-in.
 * Not a public marketing profile — only what the doctor needs day to day.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { CalendarDays, KeyRound, Mail, MapPin, Pencil, Phone } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EditDoctorProfileSheet } from '@/components/doctor/EditDoctorProfileSheet';
import { ManageAvailabilitySheet } from './ManageAvailabilitySheet';
import { AccountSettingsSheet } from '@/components/settings/AccountSettingsSheet';
import { useInvalidateDoctorProfile } from '@/hooks/doctor/useDoctorProfile';
import { doctorApi } from '@/lib/api/doctor';
import type { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';
import { DAY_NAMES, DAY_NAMES_SHORT } from '@/components/doctor/schedule/constants';
import { cn } from '@/lib/utils';

interface DoctorProfileViewProps {
  doctorData: DoctorResponseDto;
}

type SlotConfig = {
  defaultDuration: number;
  bufferTime: number;
  slotInterval: number;
};

type WorkingDayRow = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  type?: string;
};

function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-[#e7d6bf]/80 bg-white">
      <div className="flex flex-col gap-3 border-b border-[#e7d6bf]/70 px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[#2c2e4b]">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs leading-relaxed text-[#2c2e4b]/70">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="px-4 py-4 sm:px-5 sm:py-5">{children}</div>
    </section>
  );
}

export function DoctorProfileView({ doctorData }: DoctorProfileViewProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showAvailabilitySheet, setShowAvailabilitySheet] = useState(false);
  const [currentData, setCurrentData] = useState(doctorData);
  const [workingDays, setWorkingDays] = useState<WorkingDayRow[]>([]);
  const [slotConfig, setSlotConfig] = useState<SlotConfig | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const [feeDraft, setFeeDraft] = useState('');
  const [savingFee, setSavingFee] = useState(false);
  const feeInitRef = useRef<{ doctorId?: string; initialized: boolean }>({
    initialized: false,
  });
  const { invalidateProfile } = useInvalidateDoctorProfile();

  useEffect(() => {
    if (doctorData) setCurrentData(doctorData);
  }, [doctorData]);

  useEffect(() => {
    if (!doctorData) return;
    const currentDoctorId = doctorData.id;
    if (!feeInitRef.current.initialized || feeInitRef.current.doctorId !== currentDoctorId) {
      feeInitRef.current = { initialized: true, doctorId: currentDoctorId };
      setFeeDraft(String(doctorData.consultationFee ?? 0));
    }
  }, [doctorData]);

  const loadAvailability = async () => {
    setLoadingAvailability(true);
    try {
      const res = await doctorApi.getMyAvailability();
      if (res.success && res.data) {
        const daysMap: Record<string, number> = {
          Sunday: 0,
          Monday: 1,
          Tuesday: 2,
          Wednesday: 3,
          Thursday: 4,
          Friday: 5,
          Saturday: 6,
        };

        const mappedWorkingDays = (res.data.workingDays || [])
          .filter((wd: { isAvailable?: boolean }) => wd.isAvailable)
          .map(
            (wd: {
              day?: string;
              dayOfWeek?: number;
              startTime: string;
              endTime: string;
              type?: string;
            }) => ({
              dayOfWeek:
                typeof wd.dayOfWeek === 'number'
                  ? wd.dayOfWeek
                  : (daysMap[wd.day || ''] ?? 0),
              startTime: wd.startTime,
              endTime: wd.endTime,
              type: wd.type || 'CLINIC',
            }),
          )
          .sort((a: WorkingDayRow, b: WorkingDayRow) => a.dayOfWeek - b.dayOfWeek);

        setWorkingDays(mappedWorkingDays);
        setSlotConfig(res.data.slotConfiguration ?? null);
      }
    } catch {
      // Non-blocking
    } finally {
      setLoadingAvailability(false);
    }
  };

  useEffect(() => {
    void loadAvailability();
  }, []);

  const doctor = currentData;
  const initials =
    doctor.name
      ?.split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) ?? '';

  const displayName = (() => {
    const rawName = (doctor.name || '').trim();
    const title = (doctor.title || '').trim();
    if (!title) return rawName;
    if (rawName.toLowerCase().startsWith(title.toLowerCase())) return rawName;
    return `${title} ${rawName}`.trim();
  })();

  const needsOnboarding = Boolean(
    doctor.onboardingStatus && doctor.onboardingStatus !== 'ACTIVE',
  );

  const onboardingItems = useMemo(
    () => [
      {
        label: 'Clinic location',
        done: Boolean(doctor.clinicLocation?.trim()),
      },
      {
        label: 'Consultation fee',
        done: (doctor.consultationFee ?? 0) > 0,
      },
    ],
    [doctor],
  );

  const parsedFee = (() => {
    const trimmed = feeDraft.trim();
    if (trimmed === '') return 0;
    const v = Number(trimmed);
    if (!Number.isFinite(v) || v < 0) return null;
    return v;
  })();

  const saveConsultationFee = async () => {
    if (parsedFee === null) {
      toast.error('Enter a valid consultation fee');
      return;
    }
    setSavingFee(true);
    try {
      const res = await doctorApi.updateProfile({ consultationFee: parsedFee });
      if (!res.success) {
        toast.error(res.error || 'Failed to update consultation fee');
        return;
      }
      toast.success('Consultation fee updated');
      setCurrentData((prev) => ({ ...prev, consultationFee: parsedFee }));
      await invalidateProfile();
    } finally {
      setSavingFee(false);
    }
  };

  if (!currentData) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-sm text-[#e7d6bf]">Profile not available.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Your profile</h1>
          <p className="mt-1 text-sm text-[#e7d6bf]">
            Account details, clinic hours, and consultation fee.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-md border-[#e7d6bf]/40 bg-transparent px-3 text-xs font-medium text-[#e7d6bf] hover:bg-white/10 hover:text-white"
            onClick={() => setShowAccountSettings(true)}
          >
            <KeyRound className="mr-1.5 h-3.5 w-3.5" />
            Sign-in & security
          </Button>
          <Button
            size="sm"
            className="h-9 rounded-md bg-[#caa26a] px-4 text-xs font-semibold text-[#2c2e4b] hover:bg-[#b8913e]"
            onClick={() => setShowEditDialog(true)}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit profile
          </Button>
        </div>
      </header>

      {needsOnboarding ? (
        <div className="border border-[#caa26a]/40 bg-[#2c2e4b]/55 px-4 py-3.5 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">Finish setting up</p>
              <p className="mt-1 text-xs text-[#e7d6bf]">
                Add your clinic location and consultation fee so the desk can book and bill with
                you.
              </p>
            </div>
            <Button
              size="sm"
              className="h-8 shrink-0 rounded-md bg-[#caa26a] px-3 text-xs font-semibold text-[#2c2e4b] hover:bg-[#b8913e]"
              onClick={() => setShowEditDialog(true)}
            >
              Complete profile
            </Button>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {onboardingItems.map((item) => (
              <div key={item.label} className="border border-white/15 bg-white/5 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#e7d6bf]/80">
                  {item.label}
                </p>
                <p
                  className={cn(
                    'mt-1 text-xs font-semibold',
                    item.done ? 'text-[#caa26a]' : 'text-white',
                  )}
                >
                  {item.done ? 'Done' : 'Still needed'}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <Section
        title="Account"
        description="Your name, specialty, and contact details for clinic use."
        action={
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-md border-[#e7d6bf] text-xs text-[#2c2e4b] hover:bg-[#e7d6bf]/30"
            onClick={() => setShowEditDialog(true)}
          >
            Edit
          </Button>
        }
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex shrink-0 justify-center sm:justify-start">
            {doctor.profileImage ? (
              <div className="relative h-16 w-16 overflow-hidden border border-[#e7d6bf]">
                <Image
                  src={doctor.profileImage}
                  alt={displayName}
                  fill
                  className="object-cover"
                  sizes="64px"
                  priority
                />
              </div>
            ) : (
              <div
                className="flex h-16 w-16 items-center justify-center text-lg font-bold text-white"
                style={{ backgroundColor: doctor.colorCode || '#003b53' }}
              >
                {initials}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <h3 className="text-lg font-semibold text-[#2c2e4b]">{displayName}</h3>
              <p className="mt-0.5 text-sm text-[#005f73]">{doctor.specialization}</p>
            </div>

            <div className="space-y-2">
              {doctor.email ? (
                <div className="flex items-center gap-2 text-sm text-[#2c2e4b]">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-[#caa26a]" />
                  <span className="truncate">{doctor.email}</span>
                </div>
              ) : null}
              {doctor.phone ? (
                <div className="flex items-center gap-2 text-sm text-[#2c2e4b]">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-[#caa26a]" />
                  {doctor.phone}
                </div>
              ) : null}
              {doctor.clinicLocation ? (
                <div className="flex items-center gap-2 text-sm text-[#2c2e4b]">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-[#caa26a]" />
                  {doctor.clinicLocation}
                </div>
              ) : (
                <p className="text-xs text-[#2c2e4b]/55">No clinic location set yet.</p>
              )}
            </div>
          </div>
        </div>
      </Section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Section
          title="Clinic schedule"
          description="Hours the front desk books against."
          action={
            <Button
              size="sm"
              className="h-8 rounded-md bg-[#005f73] px-3 text-xs font-semibold text-white hover:bg-[#003b53]"
              onClick={() => setShowAvailabilitySheet(true)}
            >
              {workingDays.length || slotConfig ? 'Manage' : 'Set up'}
            </Button>
          }
        >
          {loadingAvailability ? (
            <p className="text-xs text-[#2c2e4b]/60">Loading schedule…</p>
          ) : workingDays.length > 0 ? (
            <div className="space-y-3">
              <div className="divide-y divide-[#e7d6bf]/70 border border-[#e7d6bf]/80">
                {workingDays.map((day) => (
                  <div
                    key={`${day.dayOfWeek}-${day.startTime}`}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                  >
                    <span className="font-medium text-[#2c2e4b]">
                      <span className="sm:hidden">{DAY_NAMES_SHORT[day.dayOfWeek]}</span>
                      <span className="hidden sm:inline">{DAY_NAMES[day.dayOfWeek]}</span>
                    </span>
                    <span className="tabular-nums text-[#2c2e4b]/80">
                      {day.startTime} – {day.endTime}
                    </span>
                  </div>
                ))}
              </div>
              {slotConfig ? (
                <p className="text-xs text-[#2c2e4b]/65">
                  Slots {slotConfig.defaultDuration} min · buffer {slotConfig.bufferTime} min ·
                  interval {slotConfig.slotInterval} min
                </p>
              ) : null}
            </div>
          ) : (
            <div className="border border-dashed border-[#e7d6bf] bg-[#e7d6bf]/10 px-4 py-5 text-center">
              <CalendarDays className="mx-auto mb-2 h-5 w-5 text-[#caa26a]" />
              <p className="text-sm font-medium text-[#2c2e4b]">No clinic hours yet</p>
              <Button
                size="sm"
                className="mt-3 h-8 rounded-md bg-[#005f73] px-3 text-xs font-semibold text-white hover:bg-[#003b53]"
                onClick={() => setShowAvailabilitySheet(true)}
              >
                Set up schedule
              </Button>
            </div>
          )}
        </Section>

        <Section
          title="Consultation fee"
          description="Default amount used on the charge sheet when you complete a visit."
        >
          <label className="text-xs font-medium text-[#2c2e4b]" htmlFor="consultation-fee">
            Amount (KES)
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              id="consultation-fee"
              value={feeDraft}
              onChange={(e) => setFeeDraft(e.target.value)}
              inputMode="numeric"
              className="h-10 rounded-md border-[#e7d6bf] text-[#2c2e4b] focus-visible:ring-[#caa26a]"
              placeholder="0"
            />
            <Button
              className="h-10 rounded-md bg-[#caa26a] px-4 text-xs font-semibold text-[#2c2e4b] hover:bg-[#b8913e] sm:shrink-0"
              onClick={saveConsultationFee}
              disabled={savingFee}
            >
              {savingFee ? 'Saving…' : 'Save fee'}
            </Button>
          </div>
        </Section>
      </div>

      <section className="flex flex-col gap-3 border border-white/15 bg-[#2c2e4b]/55 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">Sign-in & security</p>
          <p className="mt-0.5 text-xs text-[#e7d6bf]">Change email or password for this account.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-9 shrink-0 rounded-md border-[#e7d6bf]/40 bg-transparent px-3 text-xs font-medium text-[#e7d6bf] hover:bg-white/10 hover:text-white"
          onClick={() => setShowAccountSettings(true)}
        >
          <KeyRound className="mr-1.5 h-3.5 w-3.5" />
          Manage credentials
        </Button>
      </section>

      <EditDoctorProfileSheet
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        onSuccess={() => invalidateProfile()}
        doctor={currentData}
      />

      <AccountSettingsSheet
        open={showAccountSettings}
        onClose={() => setShowAccountSettings(false)}
        currentEmail={currentData.email}
      />

      <ManageAvailabilitySheet
        open={showAvailabilitySheet}
        onClose={() => setShowAvailabilitySheet(false)}
        onSuccess={() => {
          void loadAvailability();
          invalidateProfile();
        }}
        userId={currentData.id}
        initialWorkingDays={workingDays}
        initialSlotConfig={slotConfig}
      />
    </div>
  );
}
