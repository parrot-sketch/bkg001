'use client';

import { Controller } from 'react-hook-form';
import PhoneInput from 'react-phone-number-input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { usePatientRegistrationDialog, type PatientRegistrationFormData } from './usePatientRegistrationDialog';

const inputClass =
  "w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 " +
  "focus:outline-none focus:border-[#caa26a] focus:ring-2 focus:ring-[#caa26a]/20 transition-all";
const labelClass = "block text-sm font-semibold text-slate-700 mb-1.5";

interface PatientRegistrationDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (patient: PatientResponseDto) => void;
}

export function PatientRegistrationDialog({
  open,
  onClose,
  onSuccess,
}: PatientRegistrationDialogProps) {
  const {
    STEPS,
    step,
    currentStep,
    stepProgress,
    submitting,
    submitted,
    submitError,
    isMinor,
    form,
    goNext,
    goPrev,
    submit,
    close,
  } = usePatientRegistrationDialog({ open, onClose, onSuccess });

  const { register, control, formState: { errors }, getValues, watch } = form;

  const watchedDob = watch('dateOfBirth');
  const displayStep = isMinor && step === 2 ? 3 : step;

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto p-0 gap-0">
          <DialogTitle className="sr-only">Register patient</DialogTitle>
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="h-20 w-20 bg-green-50 rounded-full flex items-center justify-center mb-6">
              <Check className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Patient Registered</h1>
            <p className="text-slate-500 text-sm">
              {getValues('firstName')} {getValues('lastName')} has been added to the registry.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogTitle className="sr-only">Register patient</DialogTitle>
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Register New Patient</h2>
              <p className="text-sm text-slate-500">Step {displayStep} of {isMinor ? STEPS.length - 1 : STEPS.length}</p>
            </div>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#caa26a] transition-all duration-300"
              style={{ width: `${stepProgress}%` }}
            />
          </div>
        </div>

        {/* Form Content */}
        <div className="px-6 py-6">
          <div className="space-y-4">
            {/* Step 1: Personal */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>First Name *</label>
                  <input {...register('firstName')} placeholder="First name" className={inputClass} autoFocus />
                  {errors.firstName && <p className="text-red-500 text-xs mt-1.5">{errors.firstName.message}</p>}
                </div>
                <div>
                  <label className={labelClass}>Last Name *</label>
                  <input {...register('lastName')} placeholder="Last name" className={inputClass} />
                  {errors.lastName && <p className="text-red-500 text-xs mt-1.5">{errors.lastName.message}</p>}
                </div>
                <div>
                  <label className={labelClass}>Date of Birth *</label>
                  <input {...register('dateOfBirth')} type="date" className={inputClass} />
                  {errors.dateOfBirth && <p className="text-red-500 text-xs mt-1.5">{errors.dateOfBirth.message}</p>}
                </div>
                <div>
                  <label className={labelClass}>Gender *</label>
                  <select {...register('gender')} className={cn(inputClass, "bg-white")}>
                    <option value="FEMALE">Female</option>
                    <option value="MALE">Male</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
            )}

            {/* Step 2: Contact */}
            {step === 2 && !isMinor && (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Phone Number</label>
                  <Controller
                    name="phone"
                    control={control}
                    render={({ field }) => (
                      <PhoneInput
                        {...field}
                        international
                        defaultCountry="KE"
                        className="phone-input-custom"
                        onChange={(value) => field.onChange(value ?? '')}
                      />
                    )}
                  />
                  {errors.phone && <p className="text-red-500 text-xs mt-1.5">{errors.phone.message}</p>}
                </div>
                <div>
                  <label className={labelClass}>WhatsApp Number</label>
                  <Controller
                    name="whatsappPhone"
                    control={control}
                    render={({ field }) => (
                      <PhoneInput
                        {...field}
                        international
                        defaultCountry="KE"
                        className="phone-input-custom"
                        onChange={(value) => field.onChange(value ?? '')}
                      />
                    )}
                  />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input {...register('email')} type="email" placeholder="email@example.com" className={inputClass} />
                  {errors.email && <p className="text-red-500 text-xs mt-1.5">{errors.email.message}</p>}
                </div>
                <div>
                  <label className={labelClass}>Address</label>
                  <input {...register('address')} placeholder="e.g. Westlands, Nairobi" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Marital Status</label>
                  <select {...register('maritalStatus')} className={cn(inputClass, "bg-white")}>
                    <option value="">Prefer not to say</option>
                    <option value="SINGLE">Single</option>
                    <option value="MARRIED">Married</option>
                    <option value="DIVORCED">Divorced</option>
                    <option value="WIDOWED">Widowed</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Occupation</label>
                  <input {...register('occupation')} placeholder="Occupation" className={inputClass} />
                </div>
              </div>
            )}

            {/* Step 3: Emergency */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Contact Name</label>
                  <input {...register('emergencyContactName')} placeholder="Full name" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Contact Phone</label>
                  <Controller
                    name="emergencyContactNumber"
                    control={control}
                    render={({ field }) => (
                      <PhoneInput
                        {...field}
                        international
                        defaultCountry="KE"
                        className="phone-input-custom"
                        onChange={(value) => field.onChange(value ?? '')}
                      />
                    )}
                  />
                </div>
                <div>
                  <label className={labelClass}>Relationship</label>
                  <select {...register('emergencyContactRelation')} className={cn(inputClass, "bg-white")}>
                    <option value="">Select relationship</option>
                    <option value="SPOUSE">Spouse / Partner</option>
                    <option value="PARENT">Parent</option>
                    <option value="SIBLING">Sibling</option>
                    <option value="CHILD">Child</option>
                    <option value="FRIEND">Friend</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
            )}

            {/* Step 4: Medical */}
            {step === 4 && (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Blood Group</label>
                  <select {...register('bloodGroup')} className={cn(inputClass, "bg-white")}>
                    <option value="">Not sure</option>
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Known Allergies</label>
                  <textarea
                    {...register('allergies')}
                    rows={3}
                    placeholder="e.g. Penicillin, latex... or leave blank"
                    className={cn(inputClass, "resize-none")}
                  />
                </div>
                <div>
                  <label className={labelClass}>Medical Conditions</label>
                  <textarea
                    {...register('medicalConditions')}
                    rows={3}
                    placeholder="e.g. Diabetes, hypertension... or leave blank"
                    className={cn(inputClass, "resize-none")}
                  />
                </div>

                {submitError && (
                  <div className="border border-red-200 bg-red-50 p-3 flex items-start gap-2 rounded-xl">
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs font-medium text-red-600">{submitError}</p>
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Review */}
            {step === 5 && (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                  <h3 className="font-semibold text-slate-900 mb-3">About You</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Name</p>
                      <p className="font-medium text-slate-900 mt-0.5">{getValues('firstName')} {getValues('lastName')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Date of Birth</p>
                      <p className="font-medium text-slate-900 mt-0.5">{getValues('dateOfBirth')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Gender</p>
                      <p className="font-medium text-slate-900 mt-0.5">{getValues('gender')}</p>
                    </div>
                  </div>
                </div>

                {!isMinor && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                    <h3 className="font-semibold text-slate-900 mb-3">Contact Info</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Email</p>
                        <p className="font-medium text-slate-900 mt-0.5">{getValues('email')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Phone</p>
                        <p className="font-medium text-slate-900 mt-0.5">{getValues('phone')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">WhatsApp</p>
                        <p className="font-medium text-slate-900 mt-0.5">{getValues('whatsappPhone') || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Address</p>
                        <p className="font-medium text-slate-900 mt-0.5">{getValues('address')}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-sm text-green-900">
                    Everything looks good? Click Register to add this patient to the system. You can still go back to edit anything.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={goPrev}
              disabled={submitting}
              className="rounded-xl h-11"
            >
              Back
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              onClick={close}
              disabled={submitting}
              className="rounded-xl h-11"
            >
              Cancel
            </Button>
          )}

          {step < STEPS.length ? (
            <Button
              type="button"
              onClick={goNext}
              disabled={submitting}
              className="flex-1 rounded-xl h-11 bg-[#caa26a] hover:bg-[#b8913e] text-[#2c2e4b] font-medium"
            >
              {isMinor && step === 1 ? 'Skip' : 'Continue'}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={submit}
              disabled={submitting}
              className={cn(
                "flex-1 rounded-xl h-11 font-medium",
                submitting
                  ? "bg-slate-100 text-slate-400"
                  : "bg-[#2c2e4b] hover:bg-[#1a1b2e] text-white"
              )}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Registering...
                </>
              ) : (
                'Register Patient'
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
