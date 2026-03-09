'use client';

/**
 * MobileIntakeForm — Clinic-branded, mobile-first 5-step patient intake form
 *
 * Steps:
 *   1. Personal Info (name, DOB, gender)
 *   2. Contact Info (phone, WhatsApp, email, address, marital status)
 *   3. Emergency + Insurance (merged — both are short)
 *   4. Medical History (blood group, allergies, conditions)
 *   5. Consent + Review
 *
 * localStorage isolation: draft key includes sessionId so multiple
 * patients on the same device don't share drafts.
 */

import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PatientIntakeFormSchema } from '@/lib/schema';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { Shield, ChevronLeft, ChevronRight, CheckCircle2, Loader2, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Types ── */
type FormData = {
    firstName: string; lastName: string; dateOfBirth: string; gender: string;
    email: string; phone: string; whatsappPhone?: string; address: string;
    maritalStatus?: string; occupation?: string;
    emergencyContactName?: string; emergencyContactNumber?: string; emergencyContactRelation?: string;
    bloodGroup?: string; allergies?: string; medicalConditions?: string;
    privacyConsent: boolean; serviceConsent: boolean; medicalConsent: boolean;
};

const STEPS = [
    { id: 1, label: 'Personal', fields: ['firstName', 'lastName', 'dateOfBirth', 'gender'] as const },
    { id: 2, label: 'Contact', fields: ['email', 'phone', 'whatsappPhone', 'address', 'maritalStatus', 'occupation'] as const },
    { id: 3, label: 'Emergency', fields: ['emergencyContactName', 'emergencyContactNumber', 'emergencyContactRelation'] as const },
    { id: 4, label: 'Medical', fields: ['bloodGroup', 'allergies', 'medicalConditions'] as const },
];

/* ── Input helpers ── */
function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-900">
                {label}{required && <span className="text-red-600 ml-0.5">*</span>}
            </label>
            {children}
            {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
        </div>
    );
}

const inputClass = "w-full h-11 px-3 rounded-none border-b border-slate-300 bg-transparent text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-primary transition-colors";
const selectClass = `${inputClass} appearance-none bg-white`;

/* ── Main component ── */
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
    const [draftSaved, setDraftSaved] = useState(false);

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

    const { register, control, formState: { errors }, trigger, getValues, watch } = form;

    /* Load draft on mount */
    useEffect(() => {
        try {
            const saved = localStorage.getItem(DRAFT_KEY);
            if (saved) {
                const draft = JSON.parse(saved);
                form.reset(draft);
            }
        } catch { }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* Auto-save draft */
    useEffect(() => {
        const sub = form.watch((data) => {
            try {
                localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
                setDraftSaved(true);
                const t = setTimeout(() => setDraftSaved(false), 1500);
                return () => clearTimeout(t);
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
        const currentFields = STEPS[step - 1].fields as unknown as string[];
        // Skip validation for optional-only steps (insurance)
        const fieldsToValidate = currentFields.filter(f => !['insuranceProvider', 'insuranceNumber', 'occupation', 'whatsappPhone', 'bloodGroup', 'allergies', 'medicalConditions', 'medicalHistory'].includes(f));
        const valid = step < 5 ? await trigger(fieldsToValidate as any) : true;
        if (valid) {
            setStep((s) => Math.min(s + 1, STEPS.length));
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [step, trigger]);

    const goPrev = useCallback(() => {
        setStep((s) => Math.max(s - 1, 1));
        window.scrollTo({ top: 0, behavior: 'smooth' });
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

    const pw = watch('privacyConsent');
    const sw = watch('serviceConsent');
    const mw = watch('medicalConsent');

    /* ── Success screen ── */
    if (submitted) {
        const firstName = getValues('firstName');
        return (
            <div className="min-h-screen bg-white flex flex-col">
                <ClinicHeader />
                <div className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-sm mx-auto w-full">
                    <div className="h-20 w-20 rounded-full bg-emerald-50 flex items-center justify-center mb-6">
                        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-3">
                        {firstName ? `You're all set, ${firstName}!` : 'You\'re all set!'}
                    </h1>
                    <p className="text-slate-500 text-sm leading-relaxed mb-2">
                        Your details have been received by the Nairobi Sculpt team.
                    </p>
                    <p className="text-slate-500 text-sm leading-relaxed mb-4">
                        Please take a seat — a member of our team will call your name shortly.
                    </p>
                    <p className="text-xs text-slate-400">You can close this browser tab.</p>
                </div>
                <PrivacyFooter />
            </div>
        );
    }

    const stepProgress = (step / STEPS.length) * 100;
    const currentStepLabel = STEPS[step - 1].label;
    return (
        <div className="min-h-screen bg-slate-50/50 flex flex-col pt-4 pb-12">
            {/* ── Clinic Header (Floating Card Style) ── */}
            <div className="px-5 mb-6">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 leading-tight">Patient Intake</h1>
                        <p className="text-xs text-slate-500 font-medium">Nairobi Sculpt Aesthetic Centre</p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-rose-600 flex items-center justify-center shadow-sm">
                        <span className="text-white font-bold text-xs">NS</span>
                    </div>
                </div>
            </div>

            {/* ── Main Form Area ── */}
            <div className="flex-1 px-5">
                <div className="max-w-lg mx-auto space-y-6">

                    {/* ── Progress & Timer Card ── */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Step {step} of {STEPS.length}
                            </span>
                            <div className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold",
                                minutesLeft <= 10 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500'
                            )}>
                                <Clock className="h-3 w-3" />
                                {minutesLeft}m remaining
                            </div>
                        </div>
                        <div className="h-1.5 bg-slate-100 w-full rounded-full overflow-hidden">
                            <div
                                className="h-full bg-slate-900 transition-all duration-500 ease-out"
                                style={{ width: `${stepProgress}%` }}
                            />
                        </div>
                        <div className="mt-3 flex justify-between items-center">
                            <h2 className="text-sm font-bold text-slate-900">{currentStepLabel}</h2>
                            {draftSaved && (
                                <span className="text-[10px] font-medium text-emerald-500 flex items-center gap-1">
                                    <div className="h-1 w-1 rounded-full bg-emerald-500" />
                                    Progress saved
                                </span>
                            )}
                        </div>
                    </div>

                    {/* ── Content Card ── */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[300px] overflow-hidden">
                        <div className="p-6 space-y-7">
                            {/* ─ Step 1: Personal Info ─ */}
                            {step === 1 && (
                                <>
                                    <StepHeading title="Tell us about yourself" />
                                    <Field label="First Name" required error={errors.firstName?.message as string}>
                                        <input {...register('firstName')} placeholder="e.g. Amina" className={inputClass} autoFocus />
                                    </Field>
                                    <Field label="Last Name" required error={errors.lastName?.message as string}>
                                        <input {...register('lastName')} placeholder="e.g. Wanjiku" className={inputClass} />
                                    </Field>
                                    <Field label="Date of Birth" required error={errors.dateOfBirth?.message as string}>
                                        <input {...register('dateOfBirth')} type="date" className={inputClass} />
                                    </Field>
                                    <Field label="Gender" required error={errors.gender?.message as string}>
                                        <select {...register('gender')} className={selectClass}>
                                            <option value="FEMALE">Female</option>
                                            <option value="MALE">Male</option>
                                            <option value="OTHER">Other / Prefer not to say</option>
                                        </select>
                                    </Field>
                                </>
                            )}

                            {/* ─ Step 2: Contact Info ─ */}
                            {step === 2 && (
                                <>
                                    <StepHeading title="How can we reach you?" />
                                    <Field label="Phone Number" required error={errors.phone?.message as string}>
                                        <Controller
                                            name="phone"
                                            control={control}
                                            render={({ field }) => (
                                                <PhoneInput
                                                    {...field}
                                                    international
                                                    defaultCountry="KE"
                                                    className={inputClass}
                                                />
                                            )}
                                        />
                                    </Field>
                                    <Field label="WhatsApp Number" error={errors.whatsappPhone?.message as string}>
                                        <Controller
                                            name="whatsappPhone"
                                            control={control}
                                            render={({ field }) => (
                                                <PhoneInput
                                                    {...field}
                                                    international
                                                    defaultCountry="KE"
                                                    className={inputClass}
                                                />
                                            )}
                                        />
                                    </Field>
                                    <Field label="Email Address" required error={errors.email?.message as string}>
                                        <input {...register('email')} type="email" placeholder="your@email.com" className={inputClass} />
                                    </Field>
                                    <Field label="Home Address" required error={errors.address?.message as string}>
                                        <input {...register('address')} placeholder="e.g. Westlands, Nairobi" className={inputClass} />
                                    </Field>
                                    <Field label="Marital Status" error={errors.maritalStatus?.message as string}>
                                        <select {...register('maritalStatus')} className={selectClass}>
                                            <option value="">Prefer not to say</option>
                                            <option value="SINGLE">Single</option>
                                            <option value="MARRIED">Married</option>
                                            <option value="DIVORCED">Divorced</option>
                                            <option value="WIDOWED">Widowed</option>
                                        </select>
                                    </Field>
                                    <Field label="Occupation" error={errors.occupation?.message as string}>
                                        <input {...register('occupation')} placeholder="e.g. Teacher (optional)" className={inputClass} />
                                    </Field>
                                </>
                            )}

                            {/* ─ Step 3: Emergency Contact ─ */}
                            {step === 3 && (
                                <>
                                    <StepHeading title="Emergency Contact" />
                                    <Field label="Contact Name" error={errors.emergencyContactName?.message as string}>
                                        <input {...register('emergencyContactName')} placeholder="Full name" className={inputClass} autoFocus />
                                    </Field>
                                    <Field label="Contact Phone" error={errors.emergencyContactNumber?.message as string}>
                                        <Controller
                                            name="emergencyContactNumber"
                                            control={control}
                                            render={({ field }) => (
                                                <PhoneInput
                                                    {...field}
                                                    international
                                                    defaultCountry="KE"
                                                    className={inputClass}
                                                />
                                            )}
                                        />
                                    </Field>
                                    <Field label="Relationship" error={errors.emergencyContactRelation?.message as string}>
                                        <select {...register('emergencyContactRelation')} className={selectClass}>
                                            <option value="">Select relationship</option>
                                            <option value="SPOUSE">Spouse / Partner</option>
                                            <option value="PARENT">Parent</option>
                                            <option value="SIBLING">Sibling</option>
                                            <option value="CHILD">Child</option>
                                            <option value="FRIEND">Friend</option>
                                            <option value="OTHER">Other</option>
                                        </select>
                                    </Field>
                                </>
                            )}

                            {/* ─ Step 4: Medical History ─ */}
                            {step === 4 && (
                                <>
                                    <StepHeading title="Medical Overview" />
                                    <Field label="Blood Group">
                                        <select {...register('bloodGroup')} className={selectClass}>
                                            <option value="">Not sure / prefer not to say</option>
                                            {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                                                <option key={bg} value={bg}>{bg}</option>
                                            ))}
                                        </select>
                                    </Field>
                                    <Field label="Known Allergies">
                                        <textarea
                                            {...register('allergies')}
                                            rows={3}
                                            placeholder="e.g. Penicillin, latex, pollen… or leave blank"
                                            className={`${inputClass} !h-auto py-3 resize-none`}
                                        />
                                    </Field>
                                    <Field label="Medical Conditions">
                                        <textarea
                                            {...register('medicalConditions')}
                                            rows={3}
                                            placeholder="e.g. Diabetes, hypertension… or leave blank"
                                            className={`${inputClass} !h-auto py-3 resize-none`}
                                        />
                                    </Field>

                                    {submitError && (
                                        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-start gap-2">
                                            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                                            <p className="text-xs font-medium text-red-600">{submitError}</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* ── Action Buttons (Fixed inside Card for cohesion) ── */}
                        <div className="px-6 py-6 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
                            {step > 1 && (
                                <button
                                    type="button"
                                    onClick={goPrev}
                                    className="h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-600 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                            )}
                            {step < STEPS.length ? (
                                <button
                                    type="button"
                                    onClick={goNext}
                                    className="flex-1 h-12 bg-slate-900 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-black active:scale-[0.98] transition-all shadow-md shadow-slate-200"
                                >
                                    Continue
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className={cn(
                                        "flex-1 h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]",
                                        submitting
                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100'
                                    )}
                                >
                                    {submitting ? (
                                        <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
                                    ) : (
                                        <><CheckCircle2 className="h-4 w-4" /> Complete Intake</>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    <PrivacyFooter />
                </div>
            </div>
        </div>
    );
}

/* ── Sub-components ── */

function ClinicHeader() {
    return (
        <div className="px-5 pt-6 pb-4 border-b border-slate-200">
            <h1 className="text-xl font-semibold text-slate-900">Patient Intake Form</h1>
            <p className="text-sm text-slate-500 mt-1">Nairobi Sculpt Aesthetic Centre</p>
        </div>
    );
}

function PrivacyFooter() {
    return (
        <div className="px-5 pb-6 pt-4 text-center border-t border-slate-100">
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                <Shield className="h-4 w-4 shrink-0" />
                <span>Encrypted & secure clinical record.</span>
            </div>
        </div>
    );
}

function StepHeading({ title }: { title: string }) {
    return (
        <div className="pb-4 border-b border-slate-200 mb-6">
            <h2 className="text-xl font-medium text-slate-900">{title}</h2>
        </div>
    );
}


