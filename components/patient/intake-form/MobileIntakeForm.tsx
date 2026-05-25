'use client';

import type { CSSProperties } from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PatientIntakeFormSchema } from '@/lib/schema';
import PhoneInput from 'react-phone-number-input';

declare module 'react-phone-number-input' {
  interface PhoneInputProps extends CSSProperties {
    className?: string;
    international?: boolean;
    defaultCountry?: string;
    value?: string;
    onChange?: (value: string | undefined) => void;
  }
}

import { Shield, Check, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type FormData = {
    firstName: string; lastName: string; dateOfBirth: string; gender: string;
    email: string; phone: string; whatsappPhone?: string; address: string;
    maritalStatus?: string; occupation?: string;
    emergencyContactName?: string; emergencyContactNumber?: string; emergencyContactRelation?: string;
    bloodGroup?: string; allergies?: string; medicalConditions?: string;
    privacyConsent: boolean; serviceConsent: boolean; medicalConsent: boolean;
};

const STEPS = [
    { id: 1, title: 'Personal Info', description: 'Tell us about yourself' },
    { id: 2, title: 'Contact', description: 'How can we reach you?' },
    { id: 3, title: 'Emergency', description: 'Emergency contact details' },
    { id: 4, title: 'Medical', description: 'Your medical overview' },
];

const inputClass =
    "w-full px-0 py-3 bg-transparent border-0 border-b border-slate-300 text-slate-900 placeholder:text-slate-400 " +
    "focus:outline-none focus:border-slate-900 transition-colors";
const labelClass = "block text-[11px] font-semibold tracking-wide uppercase text-slate-600 mb-1";

function Required() {
    return <span className="text-rose-600">*</span>;
}

export function MobileIntakeForm({
    sessionId,
    minutesRemaining: initialMinutes,
}: {
    sessionId: string;
    minutesRemaining: number;
}) {
    const DRAFT_KEY = `intake_draft_${sessionId}`;
    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [minutesLeft, setMinutesLeft] = useState(initialMinutes);
    const formRef = useRef<HTMLDivElement>(null);

    const form = useForm<FormData>({
        resolver: zodResolver(PatientIntakeFormSchema) as any,
        mode: 'onBlur',
        defaultValues: {
            firstName: '', lastName: '', dateOfBirth: '', gender: 'FEMALE',
            email: '', phone: '', whatsappPhone: '', address: '',
            maritalStatus: '', occupation: '',
            emergencyContactName: '', emergencyContactNumber: '', emergencyContactRelation: '',
            bloodGroup: '', allergies: '', medicalConditions: '',
            privacyConsent: true, serviceConsent: true, medicalConsent: true,
        },
    });

    const { register, control, formState: { errors }, trigger, getValues, watch, setValue } = form;

    /* Load draft on mount */
    useEffect(() => {
        try {
            const saved = localStorage.getItem(DRAFT_KEY);
            if (saved) {
                const draft = JSON.parse(saved);
                form.reset(draft);
            }
        } catch { }
    }, [form, DRAFT_KEY]);

    /* Auto-save draft */
    useEffect(() => {
        const sub = form.watch((data) => {
            try {
                localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
            } catch { }
        });
        return () => sub.unsubscribe();
    }, [form, DRAFT_KEY]);

    /* Countdown timer */
    useEffect(() => {
        const interval = setInterval(() => setMinutesLeft((m) => Math.max(0, m - 1)), 60000);
        return () => clearInterval(interval);
    }, []);

    /* Step navigation */
    const goNext = useCallback(async () => {
        let fieldsToValidate: string[] = [];
        
        if (step === 1) {
            fieldsToValidate = ['firstName', 'lastName', 'dateOfBirth', 'gender'];
        } else if (step === 2) {
            fieldsToValidate = ['phone', 'email', 'address'];
        } else if (step === 3) {
            fieldsToValidate = [];
        } else if (step === 4) {
            fieldsToValidate = [];
        }
        
        const valid = fieldsToValidate.length === 0 || await trigger(fieldsToValidate as any);
        
        if (valid) {
            setStep((s) => Math.min(s + 1, STEPS.length));
            if (formRef.current) {
                formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }, [step, trigger]);

    const goPrev = useCallback(() => {
        setStep((s) => Math.max(s - 1, 1));
        if (formRef.current) {
            formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, []);

    /* Submit */
    const handleSubmit = async () => {
        setSubmitting(true);
        setSubmitError(null);
        try {
            const raw = getValues();
            const clean = Object.fromEntries(
                Object.entries(raw).map(([k, v]) => [k, v === '' ? undefined : v]).filter(([, v]) => v !== undefined)
            );
            const res = await fetch('/api/patient/intake', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, ...clean }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Submission failed');
            }
            localStorage.removeItem(DRAFT_KEY);
            setSubmitted(true);
        } catch (e) {
            setSubmitError(e instanceof Error ? e.message : 'Something went wrong');
        } finally {
            setSubmitting(false);
        }
    };

    const stepProgress = (step / STEPS.length) * 100;

    // Session can expire while the patient is mid-form.
    // The server will reject submission anyway; we show a clear clinical message.
    if (!submitted && minutesLeft <= 0) {
        return (
            <div className="min-h-screen bg-white flex flex-col">
                <div className="px-6 pt-10 pb-6 text-center border-b border-slate-100">
                    <div className="inline-flex items-center gap-2 mb-1">
                        <div className="h-8 w-8 border border-slate-300 bg-white flex items-center justify-center">
                            <span className="text-slate-900 font-bold text-sm">NS</span>
                        </div>
                        <span className="font-bold text-slate-900 text-lg">Nairobi Sculpt</span>
                    </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-sm mx-auto w-full">
                    <div className="h-16 w-16 border border-slate-300 bg-white flex items-center justify-center mb-5">
                        <AlertCircle className="h-7 w-7 text-slate-700" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 mb-2">Session expired</h1>
                    <p className="text-slate-500 text-sm leading-relaxed mb-4">
                        For your privacy, this intake session has expired. Please ask the receptionist to generate a new QR code.
                    </p>
                    <p className="text-xs text-slate-400">No information was submitted.</p>
                </div>

                <div className="px-6 pb-8 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                        <Shield className="h-3 w-3" />
                        <span>Your information stays private.</span>
                    </div>
                </div>
            </div>
        );
    }

    /* Success screen */
    if (submitted) {
        const firstName = getValues('firstName');
        return (
            <div className="min-h-screen bg-white flex flex-col">
                <div className="px-6 pt-12 pb-6 text-center border-b border-slate-100">
                    <div className="inline-flex items-center gap-2">
                        <div className="h-8 w-8 border border-slate-300 bg-white flex items-center justify-center">
                            <span className="text-slate-900 font-bold text-sm">NS</span>
                        </div>
                        <span className="font-bold text-slate-900">Nairobi Sculpt</span>
                    </div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
                    <div className="h-24 w-24 border border-slate-300 bg-white flex items-center justify-center mb-6">
                        <Check className="h-12 w-12 text-slate-900" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-3">
                        {firstName ? `You're all set, ${firstName}!` : "You're all set!"}
                    </h1>
                    <p className="text-slate-500 text-sm leading-relaxed mb-2">
                        Your details have been received.
                    </p>
                    <p className="text-slate-500 text-sm mb-6">
                        Please take a seat — we'll call your name shortly.
                    </p>
                </div>
                <div className="px-6 pb-8">
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                        <Shield className="h-3 w-3" />
                        <span>Your information is encrypted</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div ref={formRef} className="min-h-screen bg-white">
            {/* Header (minimal, clinical) */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="px-5 py-4 flex items-center gap-3">
                    <div className="h-10 w-10 bg-white border border-slate-200 flex items-center justify-center">
                        <span className="text-slate-900 font-extrabold text-sm">NS</span>
                    </div>
                    <div className="min-w-0">
                        <p className="text-[11px] tracking-wide uppercase text-slate-500">Nairobi Sculpt</p>
                        <p className="font-semibold text-slate-900 leading-tight">Patient Intake</p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="px-5 py-6 pb-24">
                <div className="max-w-md mx-auto">
                    {/* Step title */}
                    <div className="mb-6">
                        <h2 className="text-base font-semibold text-slate-900">{STEPS[step - 1].title}</h2>
                    </div>

                        {/* Form fields */}
                        <div className="space-y-4">
                        {/* Step 1: Personal */}
                        {step === 1 && (
                            <div className="space-y-4">
                                <div>
                                    <label className={labelClass}>First name <Required /></label>
                                    <input 
                                        {...register('firstName')} 
                                        placeholder="Your first name"
                                        className={inputClass}
                                        autoFocus
                                    />
                                    {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
                                </div>
                                <div>
                                    <label className={labelClass}>Last name <Required /></label>
                                    <input 
                                        {...register('lastName')} 
                                        placeholder="Your last name"
                                        className={inputClass}
                                    />
                                    {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
                                </div>
                                <div>
                                    <label className={labelClass}>Date of birth <Required /></label>
                                    <input 
                                        {...register('dateOfBirth')} 
                                        type="date"
                                        className={inputClass}
                                    />
                                    {errors.dateOfBirth && <p className="text-red-500 text-xs mt-1">{errors.dateOfBirth.message}</p>}
                                </div>
                                <div>
                                    <label className={labelClass}>Gender <Required /></label>
                                    <select {...register('gender')} className={cn(inputClass, "bg-white")}>
                                        <option value="FEMALE">Female</option>
                                        <option value="MALE">Male</option>
                                        <option value="OTHER">Other / Prefer not to say</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Contact */}
                        {step === 2 && (
                            <div className="space-y-4">
                                <div>
                                    <label className={labelClass}>Phone number <Required /></label>
                                    <Controller
                                        name="phone"
                                        control={control}
                                        render={({ field }) => (
                                            <div className="phone-input-wrapper">
                                                <PhoneInput
                                                    {...field}
                                                    international
                                                    defaultCountry="KE"
                                                    className="phone-input-custom"
                                                    onChange={(value) => field.onChange(value ?? '')}
                                                />
                                            </div>
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
                                            <div className="phone-input-wrapper">
                                                <PhoneInput
                                                    {...field}
                                                    international
                                                    defaultCountry="KE"
                                                    className="phone-input-custom"
                                                    onChange={(value) => field.onChange(value ?? '')}
                                                />
                                            </div>
                                        )}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Email <Required /></label>
                                    <input 
                                        {...register('email')} 
                                        type="email"
                                        placeholder="your@email.com"
                                        className={inputClass}
                                    />
                                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                                </div>
                                <div>
                                    <label className={labelClass}>Home address <Required /></label>
                                    <input 
                                        {...register('address')} 
                                        placeholder="e.g. Westlands, Nairobi"
                                        className={inputClass}
                                    />
                                    {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
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
                                    <input 
                                        {...register('occupation')} 
                                        placeholder="Your occupation"
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Step 3: Emergency */}
                        {step === 3 && (
                            <div className="space-y-4">
                                <div>
                                    <label className={labelClass}>Contact Name</label>
                                    <input 
                                        {...register('emergencyContactName')} 
                                        placeholder="Full name"
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Contact Phone</label>
                                    <Controller
                                        name="emergencyContactNumber"
                                        control={control}
                                        render={({ field }) => (
                                            <div className="phone-input-wrapper">
                                                <PhoneInput
                                                    {...field}
                                                    international
                                                    defaultCountry="KE"
                                                    className="phone-input-custom"
                                                    onChange={(value) => field.onChange(value ?? '')}
                                                />
                                            </div>
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
                                        <option value="">Not sure / prefer not to say</option>
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
                                    <div className="border border-red-200 bg-red-50 p-3 flex items-start gap-2">
                                        <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                                        <p className="text-xs font-medium text-red-600">{submitError}</p>
                                    </div>
                                )}
                            </div>
                        )}
                        </div>
                </div>
            </div>

            {/* Fixed bottom navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-5 py-4 z-20">
                <div className="max-w-md mx-auto flex gap-3">
                    {step > 1 ? (
                        <button
                            type="button"
                            onClick={goPrev}
                            className="px-5 py-3 border border-slate-200 font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                            Back
                        </button>
                    ) : (
                        <div className="flex-1" />
                    )}
                    
                    {step < STEPS.length ? (
                        <button
                            type="button"
                            onClick={goNext}
                            className="flex-1 px-5 py-3 bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors"
                        >
                            Continue
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={submitting}
                            className={cn(
                                "flex-1 px-5 py-3 font-medium transition-colors flex items-center justify-center gap-2",
                                submitting
                                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                    : "bg-slate-900 text-white hover:bg-slate-800"
                            )}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                'Complete Intake'
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
