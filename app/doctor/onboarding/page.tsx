'use client';

/**
 * Doctor Onboarding Portal
 * 
 * Elegant, step-by-step wizard to guide invited doctors 
 * through their initial setup. Fully integrated with backend state machine.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { useDoctorMyProfile, useDoctorMyAvailability, useInvalidateDoctorProfile } from '@/hooks/doctor/useDoctorProfile';
import { doctorApi } from '@/lib/api/doctor';
import { apiClient } from '@/lib/api/client';
import { updateAvailability, updateSlotConfiguration } from '@/app/actions/schedule';
import { 
  Lock, 
  User, 
  DollarSign, 
  Calendar, 
  Sliders, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight, 
  Loader2, 
  Sparkles, 
  ShieldCheck,
  Check,
  Plus,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import OnboardingLoading from './loading';

type StepId = 1 | 2 | 3 | 4 | 5 | 6;

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function DoctorOnboardingPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useDoctorMyProfile();
  const { data: availability, isLoading: availabilityLoading } = useDoctorMyAvailability();
  const { invalidateAll } = useInvalidateDoctorProfile();

  const [currentStep, setCurrentStep] = useState<StepId>(1);
  const [isSaving, setIsSaving] = useState(false);

  // ─── Step 1: Security State ──────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordsMatch, setPasswordsMatch] = useState(true);

  // ─── Step 2: Clinical Profile State ──────────────────────────────────────
  const [title, setTitle] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState(1);
  const [clinicLocation, setClinicLocation] = useState('');
  const [bio, setBio] = useState('');
  const [education, setEducation] = useState('');
  const [languages, setLanguages] = useState('English');

  // ─── Step 3: Consultation & Billing State ────────────────────────────────
  const [consultationFee, setConsultationFee] = useState<number>(0);

  // ─── Step 4: Appointment Rules State ─────────────────────────────────────
  const [defaultDuration, setDefaultDuration] = useState(30);
  const [slotInterval, setSlotInterval] = useState(30);
  const [bufferTime, setBufferTime] = useState(5);

  // ─── Step 5: Weekly Schedule State ───────────────────────────────────────
  type DaySchedule = {
    active: boolean;
    startTime: string;
    endTime: string;
  };
  const [weeklySchedule, setWeeklySchedule] = useState<Record<number, DaySchedule>>({
    0: { active: false, startTime: '09:00', endTime: '17:00' },
    1: { active: true, startTime: '09:00', endTime: '17:00' },
    2: { active: true, startTime: '09:00', endTime: '17:00' },
    3: { active: true, startTime: '09:00', endTime: '17:00' },
    4: { active: true, startTime: '09:00', endTime: '17:00' },
    5: { active: true, startTime: '09:00', endTime: '17:00' },
    6: { active: false, startTime: '09:00', endTime: '17:00' },
  });

  // Load existing data when fetched
  useEffect(() => {
    if (profile) {
      setTitle(profile.title || '');
      setSpecialization(profile.specialization || '');
      setYearsOfExperience(profile.yearsOfExperience || 1);
      setClinicLocation(profile.clinicLocation || '');
      setBio(profile.bio || '');
      setEducation(profile.education || '');
      setLanguages(profile.languages || 'English');
      setConsultationFee(profile.consultationFee || 0);

      // Fast forward step if doctor already completed parts
      if (profile.onboardingStatus === 'PROFILE_COMPLETED') {
        setCurrentStep(4);
      } else if (profile.onboardingStatus === 'SCHEDULE_SETUP') {
        setCurrentStep(5);
      }
    }
  }, [profile]);

  useEffect(() => {
    if (availability?.slotConfiguration) {
      setDefaultDuration(availability.slotConfiguration.defaultDuration || 30);
      setSlotInterval(availability.slotConfiguration.slotInterval || 30);
      setBufferTime(availability.slotConfiguration.bufferTime || 5);
    }
    if (availability?.workingDays && availability.workingDays.length > 0) {
      const updated = { ...weeklySchedule };
      // Reset all to inactive first
      for (let i = 0; i < 7; i++) {
        updated[i] = { active: false, startTime: '09:00', endTime: '17:00' };
      }
      // Populate active days
      availability.workingDays.forEach((day: any) => {
        const dayIdx = DAY_NAMES.indexOf(day.day);
        if (dayIdx !== -1) {
          updated[dayIdx] = {
            active: day.isAvailable,
            startTime: day.startTime || '09:00',
            endTime: day.endTime || '17:00'
          };
        }
      });
      setWeeklySchedule(updated);
    }
  }, [availability]);

  // Real-time password confirmation check
  useEffect(() => {
    if (confirmPassword) {
      setPasswordsMatch(newPassword === confirmPassword);
    } else {
      setPasswordsMatch(true);
    }
  }, [newPassword, confirmPassword]);

  // Loading state guard
  if (authLoading || profileLoading || availabilityLoading) {
    return <OnboardingLoading />;
  }

  const steps = [
    { id: 1, label: 'Security', icon: Lock },
    { id: 2, label: 'Profile', icon: User },
    { id: 3, label: 'Billing', icon: DollarSign },
    { id: 4, label: 'Weekly Schedule', icon: Calendar },
    { id: 5, label: 'Appointment Rules', icon: Sliders },
  ];

  // ─── Save Actions ────────────────────────────────────────────────────────

  const savePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All fields are required to update your password');
      return false;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return false;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return false;
    }

    setIsSaving(true);
    try {
      const result = await apiClient.put('/account/password', {
        currentPassword,
        newPassword
      });
      if (!result.success) {
        toast.error(result.error || 'Failed to update password');
        return false;
      }
      toast.success('Password updated successfully');
      return true;
    } catch (e) {
      toast.error('An error occurred during password update');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const saveProfile = async () => {
    if (!specialization.trim() || !clinicLocation.trim()) {
      toast.error('Specialization and Clinic Room/Location are required');
      return false;
    }
    if (!bio.trim() && !education.trim()) {
      toast.error('Please provide either a Bio or Education summary');
      return false;
    }

    setIsSaving(true);
    try {
      const result = await doctorApi.updateProfile({
        title,
        specialization,
        yearsOfExperience: Number(yearsOfExperience),
        clinicLocation,
        bio,
        education,
        languages
      });
      if (!result.success) {
        toast.error(result.error || 'Failed to save profile');
        return false;
      }
      toast.success('Clinical identity saved');
      await invalidateAll();
      return true;
    } catch (e) {
      toast.error('Error saving profile');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const saveBilling = async () => {
    if (consultationFee <= 0 || !Number.isFinite(consultationFee)) {
      toast.error('Please enter a valid consultation fee greater than 0');
      return false;
    }

    setIsSaving(true);
    try {
      const result = await doctorApi.updateProfile({
        consultationFee
      });
      if (!result.success) {
        toast.error(result.error || 'Failed to save fee');
        return false;
      }
      toast.success('Consultation fee set successfully');
      await invalidateAll();
      return true;
    } catch (e) {
      toast.error('Error saving billing details');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const saveWeeklySchedule = async () => {
    const activeDays = Object.entries(weeklySchedule).filter(([_, sched]) => sched.active);
    if (activeDays.length === 0) {
      toast.error('Please select at least one active working day');
      return false;
    }

    setIsSaving(true);
    try {
      // Build slots array for server action
      const slots: any[] = [];
      Object.entries(weeklySchedule).forEach(([dayIdx, sched]) => {
        if (sched.active) {
          slots.push({
            dayOfWeek: Number(dayIdx),
            startTime: sched.startTime,
            endTime: sched.endTime,
            type: 'CLINIC'
          });
        }
      });

      const res = await updateAvailability({
        doctorId: profile.id,
        templateName: 'Standard',
        slots
      });

      if (!res.success) {
        toast.error('Failed to configure availability template');
        return false;
      }

      toast.success('Weekly working hours configured');
      await invalidateAll();
      return true;
    } catch (e: any) {
      toast.error(e.message || 'Error updating availability');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const finalizeOnboarding = async () => {
    setIsSaving(true);
    try {
      // Save slot config rules, which triggers final status -> ACTIVE transition in backend
      const res = await updateSlotConfiguration({
        doctorId: profile.id,
        defaultDuration,
        slotInterval,
        bufferTime
      });

      if (!res.success) {
        toast.error('Failed to finalize rules');
        return false;
      }

      toast.success('Onboarding complete!');
      await invalidateAll();
      setCurrentStep(6);
      return true;
    } catch (e: any) {
      toast.error(e.message || 'Error saving appointment rules');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Step Transitions ────────────────────────────────────────────────────

  const handleNext = async () => {
    let success = false;
    if (currentStep === 1) {
      // Password update is optional if they are satisfied with current invite password
      if (!currentPassword && !newPassword && !confirmPassword) {
        success = true;
      } else {
        success = await savePassword();
      }
    } else if (currentStep === 2) {
      success = await saveProfile();
    } else if (currentStep === 3) {
      success = await saveBilling();
    } else if (currentStep === 4) {
      success = await saveWeeklySchedule();
    } else if (currentStep === 5) {
      success = await finalizeOnboarding();
    }

    if (success && currentStep < 5) {
      setCurrentStep((prev) => (prev + 1) as StepId);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as StepId);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50/40 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {currentStep < 6 ? (
        <div className="sm:mx-auto sm:w-full sm:max-w-3xl space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-stone-900 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">Welcome to Nairobi Sculpt</h1>
            <p className="text-sm text-stone-500">
              Dr. {profile?.firstName} {profile?.lastName} — let's prepare your clinical account.
            </p>
          </div>

          {/* Stepper progress indicator */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-stone-200" />
            </div>
            <div className="relative flex justify-between">
              {steps.map((step) => {
                const Icon = step.icon;
                const isCompleted = currentStep > step.id;
                const isActive = currentStep === step.id;

                return (
                  <div key={step.id} className="flex flex-col items-center">
                    <button
                      disabled
                      className={`relative flex h-8 w-8 items-center justify-center rounded-full border transition-all ${
                        isCompleted
                          ? 'bg-stone-900 border-stone-900 text-white'
                          : isActive
                          ? 'bg-white border-stone-900 text-stone-900 ring-2 ring-stone-900 ring-offset-2'
                          : 'bg-white border-stone-200 text-stone-400'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="h-4 w-4 stroke-[3]" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </button>
                    <span
                      className={`mt-2 text-[10px] font-semibold uppercase tracking-wider hidden sm:block ${
                        isActive ? 'text-stone-900 font-bold' : 'text-stone-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main Card Content */}
          <Card className="border-stone-200/80 shadow-sm rounded-none bg-white">
            <CardContent className="p-6 sm:p-10 space-y-6">
              
              {/* STEP 1: SECURITY */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-stone-950 flex items-center gap-2">
                      <Lock className="h-4 w-4 text-stone-500" /> Secure Your Account
                    </h2>
                    <p className="text-xs text-stone-500 mt-1">
                      Optionally update the invitation password you activated with to a permanent secure password.
                    </p>
                  </div>
                  <hr className="border-stone-100" />

                  <div className="space-y-4 max-w-md">
                    <div className="space-y-1.5">
                      <Label htmlFor="current-pw">Current Password</Label>
                      <Input
                        id="current-pw"
                        type="password"
                        placeholder="Enter current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="rounded-none border-stone-200 focus-visible:ring-stone-900 focus-visible:border-stone-900"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="new-pw">New Password</Label>
                      <Input
                        id="new-pw"
                        type="password"
                        placeholder="Enter minimum 8 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="rounded-none border-stone-200 focus-visible:ring-stone-900 focus-visible:border-stone-900"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="confirm-pw">Confirm New Password</Label>
                      <Input
                        id="confirm-pw"
                        type="password"
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`rounded-none border-stone-200 focus-visible:ring-stone-900 focus-visible:border-stone-900 ${
                          !passwordsMatch ? 'border-red-300 focus-visible:ring-red-500' : ''
                        }`}
                      />
                      {!passwordsMatch && (
                        <p className="text-[11px] text-red-600 font-medium">Passwords do not match</p>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-stone-400">
                    * If you just set your desired secure password during invitation activation, you can leave these fields empty and press Continue.
                  </p>
                </div>
              )}

              {/* STEP 2: PROFILE DETAILS */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-stone-950 flex items-center gap-2">
                      <User className="h-4 w-4 text-stone-500" /> Clinical Identity
                    </h2>
                    <p className="text-xs text-stone-500 mt-1">
                      Configure your official medical title, specialization, and room/office location.
                    </p>
                  </div>
                  <hr className="border-stone-100" />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="title">Professional Title</Label>
                      <Input
                        id="title"
                        placeholder="Dr. / Prof. / Mr."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="rounded-none border-stone-200"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="specialization">Medical Specialization</Label>
                      <Input
                        id="specialization"
                        placeholder="e.g. Consultant Plastic Surgeon"
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        className="rounded-none border-stone-200"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="experience">Years of Experience</Label>
                      <Input
                        id="experience"
                        type="number"
                        min={1}
                        value={yearsOfExperience}
                        onChange={(e) => setYearsOfExperience(Number(e.target.value))}
                        className="rounded-none border-stone-200"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="location">Clinic Room / Location *</Label>
                      <Input
                        id="location"
                        placeholder="e.g. Suite 3B, 2nd Floor"
                        value={clinicLocation}
                        onChange={(e) => setClinicLocation(e.target.value)}
                        className="rounded-none border-stone-200"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="languages">Languages Spoken</Label>
                      <Input
                        id="languages"
                        placeholder="e.g. English, Swahili"
                        value={languages}
                        onChange={(e) => setLanguages(e.target.value)}
                        className="rounded-none border-stone-200"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="bio">Professional Biography (Bio)</Label>
                      <Textarea
                        id="bio"
                        placeholder="Summarize your clinical focus, goals and philosophy..."
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={3}
                        className="rounded-none border-stone-200"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="education">Education & Credentials</Label>
                      <Textarea
                        id="education"
                        placeholder="e.g. MBChB (Nairobi), MMed Surgery (UoN)"
                        value={education}
                        onChange={(e) => setEducation(e.target.value)}
                        rows={2}
                        className="rounded-none border-stone-200"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: CONSULTATION & BILLING */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-stone-950 flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-stone-500" /> Consultation Fees
                    </h2>
                    <p className="text-xs text-stone-500 mt-1">
                      Define the standard consultation charge applied to patient visits.
                    </p>
                  </div>
                  <hr className="border-stone-100" />

                  <div className="max-w-md space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="fee">Standard Consultation Fee (KES) *</Label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400 text-xs font-semibold">
                          KES
                        </span>
                        <Input
                          id="fee"
                          type="number"
                          min={0}
                          value={consultationFee || ''}
                          onChange={(e) => setConsultationFee(Number(e.target.value))}
                          placeholder="e.g. 5000"
                          className="pl-12 rounded-none border-stone-200 font-medium text-stone-850"
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-stone-50 border border-stone-200/60 text-xs text-stone-600 space-y-2">
                      <p className="font-semibold text-stone-800">Billing Policy Note:</p>
                      <p>
                        This fee will be selected as the default rate when raising charge sheets for outpatient consultations. 
                        You can override this rate dynamically per patient check-in or visit template if necessary.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: WEEKLY SCHEDULE */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-stone-950 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-stone-500" /> Weekly Schedule Setup
                    </h2>
                    <p className="text-xs text-stone-500 mt-1">
                      Configure your available working days and active clinic hours.
                    </p>
                  </div>
                  <hr className="border-stone-100" />

                  <div className="space-y-3">
                    {DAY_NAMES.map((dayName, idx) => {
                      const sched = weeklySchedule[idx];
                      if (!sched) return null;

                      return (
                        <div 
                          key={idx} 
                          className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 border transition-colors ${
                            sched.active ? 'border-stone-300 bg-stone-50/30' : 'border-stone-100 bg-white opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={sched.active}
                              onCheckedChange={(checked) => {
                                setWeeklySchedule((prev) => ({
                                  ...prev,
                                  [idx]: { ...prev[idx], active: checked }
                                }));
                              }}
                            />
                            <span className="text-xs font-semibold text-stone-900 w-24">
                              {dayName}
                            </span>
                          </div>

                          {sched.active && (
                            <div className="flex items-center gap-2 mt-2 sm:mt-0">
                              <Select
                                value={sched.startTime}
                                onValueChange={(val) => {
                                  setWeeklySchedule((prev) => ({
                                    ...prev,
                                    [idx]: { ...prev[idx], startTime: val }
                                  }));
                                }}
                              >
                                <SelectTrigger className="h-8 w-24 rounded-none border-stone-200 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: 24 }).map((_, h) => {
                                    const hour = String(h).padStart(2, '0');
                                    return (
                                      <SelectItem key={hour} value={`${hour}:00`} className="text-xs">
                                        {hour}:00
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>

                              <span className="text-xs text-stone-400">to</span>

                              <Select
                                value={sched.endTime}
                                onValueChange={(val) => {
                                  setWeeklySchedule((prev) => ({
                                    ...prev,
                                    [idx]: { ...prev[idx], endTime: val }
                                  }));
                                }}
                              >
                                <SelectTrigger className="h-8 w-24 rounded-none border-stone-200 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: 24 }).map((_, h) => {
                                    const hour = String(h).padStart(2, '0');
                                    return (
                                      <SelectItem key={hour} value={`${hour}:00`} className="text-xs">
                                        {hour}:00
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 5: APPOINTMENT RULES */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-stone-950 flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-stone-500" /> Scheduling & Duration Rules
                    </h2>
                    <p className="text-xs text-stone-500 mt-1">
                      Configure your clinical slot intervals and buffering policies to optimize patient wait times.
                    </p>
                  </div>
                  <hr className="border-stone-100" />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="duration">Consultation Duration</Label>
                      <Select
                        value={String(defaultDuration)}
                        onValueChange={(val) => {
                          setDefaultDuration(Number(val));
                          // Keep slotInterval aligned initially
                          setSlotInterval(Number(val));
                        }}
                      >
                        <SelectTrigger id="duration" className="rounded-none border-stone-200">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="45">45 minutes</SelectItem>
                          <SelectItem value="60">60 minutes</SelectItem>
                          <SelectItem value="90">90 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-stone-400">Expected time spent with patient.</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="interval">Slot Interval</Label>
                      <Select
                        value={String(slotInterval)}
                        onValueChange={(val) => setSlotInterval(Number(val))}
                      >
                        <SelectTrigger id="interval" className="rounded-none border-stone-200">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">Every 15 minutes</SelectItem>
                          <SelectItem value="30">Every 30 minutes</SelectItem>
                          <SelectItem value="45">Every 45 minutes</SelectItem>
                          <SelectItem value="60">Every 60 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-stone-400">Controls overlapping slot increments.</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="buffer">Buffer Time</Label>
                      <Select
                        value={String(bufferTime)}
                        onValueChange={(val) => setBufferTime(Number(val))}
                      >
                        <SelectTrigger id="buffer" className="rounded-none border-stone-200">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0 minutes</SelectItem>
                          <SelectItem value="5">5 minutes</SelectItem>
                          <SelectItem value="10">10 minutes</SelectItem>
                          <SelectItem value="15">15 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-stone-400">Rest gap between slots.</p>
                    </div>
                  </div>

                  <div className="p-4 bg-stone-50 border border-stone-200/60 text-xs text-stone-600 space-y-2">
                    <p className="font-semibold text-stone-850">Wait Time Safety Net:</p>
                    <p>
                      A slot duration of <span className="font-semibold text-stone-850">{defaultDuration} mins</span> with a buffer of <span className="font-semibold text-stone-850">{bufferTime} mins</span> ensures frontdesk cannot overbook your schedule without warning.
                    </p>
                  </div>
                </div>
              )}

              {/* NAVIGATION FOOTER */}
              <div className="flex justify-between items-center pt-4 border-t border-stone-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 1 || isSaving}
                  className="rounded-none border-stone-200 text-xs gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </Button>

                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={isSaving || (currentStep === 1 && !passwordsMatch)}
                  className="rounded-none bg-stone-900 hover:bg-stone-800 text-white text-xs gap-1.5 px-6"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                    </>
                  ) : currentStep === 5 ? (
                    <>
                      Complete Setup <CheckCircle2 className="h-3.5 w-3.5" />
                    </>
                  ) : (
                    <>
                      Continue <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </div>

            </CardContent>
          </Card>
        </div>
      ) : (
        /* STEP 6: CELEBRATION SUCCESS */
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-6">
          <div className="bg-white border border-stone-200/80 p-8 shadow-sm rounded-none space-y-6">
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-stone-950">You're All Set!</h2>
              <p className="text-xs text-stone-500">
                Dr. {profile?.firstName} {profile?.lastName}, your clinical credentials, calendar slot rules, and outpatient billing rates are fully synchronized.
              </p>
            </div>

            <Button
              onClick={() => {
                // Fully redirect to dashboard
                window.location.href = '/doctor/dashboard';
              }}
              className="w-full rounded-none bg-stone-900 hover:bg-stone-800 text-white text-xs h-10"
            >
              Enter Clinical Workspace
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
