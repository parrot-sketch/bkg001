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
import { calculateAge, isMinor } from '@/lib/utils/age';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { usePatientRegistrationDialog, type PatientRegistrationFormData } from './usePatientRegistrationDialog';

const inputClass =
  "w-full px-0 py-3 bg-transparent border-0 border-b border-[#e7d6bf] text-[#2c2e4b] placeholder:text-[#2c2e4b]/40 " +
  "focus:outline-none focus:border-[#caa26a] transition-colors text-sm";
const labelClass = "block text-[11px] font-semibold tracking-wide uppercase text-[#2c2e4b]/60 mb-1";

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
    form,
    goNext,
    goPrev,
    submit,
    close,
  } = usePatientRegistrationDialog({ open, onClose, onSuccess });

  const { register, control, formState: { errors }, getValues, watch } = form;

  const dateOfBirth = watch('dateOfBirth');
  const patientIsMinor = dateOfBirth ? isMinor(dateOfBirth) : false;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogTitle className="sr-only">Register patient</DialogTitle>
         {submitted ? (
          /* Success Screen */
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="h-20 w-20 bg-white border border-[#e7d6bf] flex items-center justify-center mb-6">
              <Check className="h-10 w-10 text-[#2c2e4b]" />
            </div>
            <h1 className="text-xl font-bold text-[#2c2e4b] mb-2">Patient Registered</h1>
            <p className="text-[#2c2e4b]/60 text-sm">
              {getValues('firstName')} {getValues('lastName')} has been added to the registry.
            </p>
          </div>
        ) : (
          <>
            {/* Form Content */}
            <div className="px-6 py-6">
              <div className="space-y-4">
                 {/* Step 1: Personal */}
                 {step === 1 && (
                   <div className="space-y-4">
                     <div>
                       <label className={labelClass}>First Name *</label>
                       <input {...register('firstName')} placeholder="First name" className={inputClass} autoFocus />
                       {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
                     </div>
                     <div>
                       <label className={labelClass}>Last Name *</label>
                       <input {...register('lastName')} placeholder="Last name" className={inputClass} />
                       {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
                     </div>
                     <div>
                       <label className={labelClass}>Date of Birth *</label>
                       <input {...register('dateOfBirth')} type="date" className={inputClass} />
                       {errors.dateOfBirth && <p className="text-red-500 text-xs mt-1">{errors.dateOfBirth.message}</p>}
                     </div>
                      <div>
                        <label className={labelClass}>Gender *</label>
                        <select {...register('gender')} className={cn(inputClass, "bg-white")}>
                          <option value="FEMALE">Female</option>
                          <option value="MALE">Male</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                       <div>
                          <label className={labelClass}>How did you hear about us?</label>
                          <select {...register('referralSource')} className={cn(inputClass, "bg-white")}>
                            <option value="">Select...</option>
                            <option value="SOCIAL_MEDIA">Social Media (Instagram, Facebook, TikTok, X)</option>
                            <option value="GOOGLE_SEARCH">Google Search</option>
                            <option value="FRIEND_FAMILY">Friend / Family Referral</option>
                            <option value="DOCTOR_REFERRAL">Doctor Referral</option>
                            <option value="WALK_IN">Walk-In</option>
                            <option value="WEBSITE">Website</option>
                            <option value="ADVERTISEMENT">Advertisement</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>
                    </div>
                  )}

                 {/* Step 2: Contact */}
                 {step === 2 && (
                   <div className="space-y-4">
                     <div>
                       <label className={labelClass}>Phone Number *</label>
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
                       {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
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
                       <label className={labelClass}>{patientIsMinor ? 'Email (Parent/Guardian)' : 'Email'}</label>
                       <input {...register('email')} type="email" placeholder="email@example.com" className={inputClass} />
                       {!patientIsMinor && errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
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
                       <label className={labelClass}>{patientIsMinor ? 'Parent/Guardian Name' : 'Contact Name'}</label>
                       <input 
                         {...register('emergencyContactName')} 
                         placeholder={patientIsMinor ? "Parent/Guardian full name" : "Full name"}
                         className={inputClass}
                       />
                     </div>
                     <div>
                       <label className={labelClass}>{patientIsMinor ? 'Parent/Guardian Phone' : 'Contact Phone'}</label>
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
                         {patientIsMinor ? (
                           <>
                             <option value="">Select relationship</option>
                             <option value="PARENT">Parent</option>
                             <option value="SIBLING">Sibling (18+)</option>
                             <option value="OTHER">Other Guardian</option>
                           </>
                         ) : (
                           <>
                             <option value="">Select relationship</option>
                             <option value="SPOUSE">Spouse / Partner</option>
                             <option value="PARENT">Parent</option>
                             <option value="SIBLING">Sibling</option>
                             <option value="CHILD">Child</option>
                             <option value="FRIEND">Friend</option>
                             <option value="OTHER">Other</option>
                           </>
                         )}
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
                      <div className="bg-red-50 border border-red-200 p-3 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-xs font-medium text-red-600">{submitError}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Navigation */}
            <div className="px-6 py-4 border-t border-[#e7d6bf] flex gap-3">
              {step > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={goPrev}
                  disabled={submitting}
                  className="h-11 border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/30"
                >
                  Back
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={close}
                  disabled={submitting}
                  className="h-11 text-[#2c2e4b]/60 hover:text-[#2c2e4b]"
                >
                  Cancel
                </Button>
              )}

              {step < STEPS.length ? (
                <Button
                  type="button"
                  onClick={goNext}
                  disabled={submitting}
                  variant="outline"
                  className="flex-1 h-11 border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/30"
                >
                  Continue
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={submit}                  disabled={submitting}
                  className={cn(
                    "flex-1 h-11 font-medium",
                    submitting
                      ? "bg-[#e7d6bf] text-[#2c2e4b]/40 cursor-not-allowed"
                      : "bg-[#caa26a] hover:bg-[#b8913e] text-[#2c2e4b]"
                  )}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Registering...
                    </>
                  ) : (
                    'Register patient'
                  )}
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
