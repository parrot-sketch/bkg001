'use client';

import { useState, useCallback, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PatientIntakeFormSchema } from '@/lib/schema';
import { apiClient } from '@/lib/api/client';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { PatientDetailDto } from '@/application/dtos/PatientDetailDto';

type FormData = {
  firstName: string; lastName: string; dateOfBirth: string; gender: string;
  email: string; phone: string; whatsappPhone?: string; address?: string;
  maritalStatus?: string; occupation?: string;
  emergencyContactName?: string; emergencyContactNumber?: string; emergencyContactRelation?: string;
  bloodGroup?: string; allergies?: string; medicalConditions?: string;
  privacyConsent: boolean; serviceConsent: boolean; medicalConsent: boolean;
};

const STEPS = [
  { id: 1, title: 'Personal Info', description: 'Basic patient information' },
  { id: 2, title: 'Contact', description: 'Contact details' },
  { id: 3, title: 'Emergency', description: 'Emergency contact' },
  { id: 4, title: 'Medical', description: 'Medical overview' },
];

const inputClass = "w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all text-sm";
const labelClass = "block text-sm font-medium text-slate-700 mb-2";

interface PatientEditDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  patient: PatientDetailDto;
}

export function PatientEditDialog({
  open,
  onClose,
  onSuccess,
  patient,
}: PatientEditDialogProps) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(PatientIntakeFormSchema) as any,
    mode: 'onBlur',
    defaultValues: {
      firstName: patient.firstName || '',
      lastName: patient.lastName || '',
      dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString().split('T')[0] : '',
      gender: patient.gender || 'FEMALE',
      email: patient.email || '',
      phone: patient.phone || '',
      whatsappPhone: patient.whatsappPhone || '',
      address: patient.address || '',
      maritalStatus: patient.maritalStatus || '',
      occupation: patient.occupation || '',
      emergencyContactName: patient.emergencyContactName || '',
      emergencyContactNumber: patient.emergencyContactNumber || '',
      emergencyContactRelation: patient.relation || '',
      bloodGroup: patient.bloodGroup || '',
      allergies: patient.allergies || '',
      medicalConditions: patient.medicalConditions || '',
      privacyConsent: true, serviceConsent: true, medicalConsent: true,
    },
  });

  const { register, control, formState: { errors }, trigger, getValues, reset } = form;

  // Reset form when patient data changes
  useEffect(() => {
    reset({
      firstName: patient.firstName || '',
      lastName: patient.lastName || '',
      dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString().split('T')[0] : '',
      gender: patient.gender || 'FEMALE',
      email: patient.email || '',
      phone: patient.phone || '',
      whatsappPhone: patient.whatsappPhone || '',
      address: patient.address || '',
      maritalStatus: patient.maritalStatus || '',
      occupation: patient.occupation || '',
      emergencyContactName: patient.emergencyContactName || '',
      emergencyContactNumber: patient.emergencyContactNumber || '',
      emergencyContactRelation: patient.relation || '',
      bloodGroup: patient.bloodGroup || '',
      allergies: patient.allergies || '',
      medicalConditions: patient.medicalConditions || '',
      privacyConsent: true, serviceConsent: true, medicalConsent: true,
    });
  }, [patient, reset]);

  const goNext = useCallback(async () => {
    let fields: (keyof FormData)[] = [];
    if (step === 1) fields = ['firstName', 'lastName', 'dateOfBirth', 'gender'];
    else if (step === 2) fields = ['phone', 'email'];
    const valid = fields.length === 0 || await trigger(fields);
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length));
  }, [step, trigger]);

  const goPrev = useCallback(() => setStep((s) => Math.max(s - 1, 1)), []);

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const raw = getValues();
      const clean = Object.fromEntries(
        Object.entries(raw).map(([k, v]) => [k, v === '' ? undefined : v]).filter(([, v]) => v !== undefined)
      );

      const result = await apiClient.put(`/patients/${patient.id}`, clean);

      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success('Patient updated successfully');
      onSuccess();
      setStep(1);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      onClose();
      setStep(1);
      setSubmitError(null);
    }
  };

  const stepProgress = (step / STEPS.length) * 100;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg">Edit Patient</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-slate-900">{STEPS[step - 1].title}</p>
              <p className="text-xs text-slate-500">{STEPS[step - 1].description}</p>
            </div>
            <p className="text-xs text-slate-400">Step {step} of {STEPS.length}</p>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-rose-600 transition-all duration-300"
              style={{ width: `${stepProgress}%` }}
            />
          </div>
        </div>

        {/* Form Content */}
        <div className="px-6 py-6">
          <div className="space-y-4">
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
                  <select {...register('gender')} className={inputClass}>
                    <option value="FEMALE">Female</option>
                    <option value="MALE">Male</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Phone Number *</label>
                  <Controller
                    name="phone"
                    control={control}
                    render={({ field }) => (
                      <PhoneInput {...field} international defaultCountry="KE" className="phone-input-custom" />
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
                      <PhoneInput {...field} international defaultCountry="KE" className="phone-input-custom" />
                    )}
                  />
                </div>
                <div>
                  <label className={labelClass}>Email *</label>
                  <input {...register('email')} type="email" placeholder="email@example.com" className={inputClass} />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <label className={labelClass}>Address</label>
                  <input {...register('address')} placeholder="e.g. Westlands, Nairobi" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Marital Status</label>
                  <select {...register('maritalStatus')} className={inputClass}>
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
                      <PhoneInput {...field} international defaultCountry="KE" className="phone-input-custom" />
                    )}
                  />
                </div>
                <div>
                  <label className={labelClass}>Relationship</label>
                  <select {...register('emergencyContactRelation')} className={inputClass}>
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

            {step === 4 && (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Blood Group</label>
                  <select {...register('bloodGroup')} className={inputClass}>
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
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs font-medium text-red-600">{submitError}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={goPrev} disabled={submitting} className="rounded-xl">
              Back
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={handleClose} disabled={submitting} className="rounded-xl">
              Cancel
            </Button>
          )}

          {step < STEPS.length ? (
            <Button type="button" onClick={goNext} disabled={submitting} className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800">
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className={cn(
                "flex-1 rounded-xl",
                submitting ? "bg-slate-100 text-slate-400" : "bg-emerald-600 hover:bg-emerald-700"
              )}
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</>
              ) : (
                'Save Changes'
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
