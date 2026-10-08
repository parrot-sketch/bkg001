'use client';

import type { CSSProperties, FormEvent, ReactNode } from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import PhoneInput from 'react-phone-number-input';
import { format } from 'date-fns';
import {
    AlertCircle,
    ArrowLeft,
    BellRing,
    Check,
    Clock,
    Loader2,
    Lock,
    Pencil,
    Armchair,
} from 'lucide-react';
import { PublicIntakeSubmissionSchema, REFERRAL_SOURCES } from '@/lib/schema';
import { calculateAge } from '@/lib/utils/age';
import { cn } from '@/lib/utils';
import { DateOfBirthField } from './ui/DateOfBirthField';
import { ChoiceChips } from './ui/ChoiceChips';
import { IntakeLogo, IntakeStatusScreen, IntakeTrustFooter } from './ui/IntakeShell';

declare module 'react-phone-number-input' {
  interface PhoneInputProps extends CSSProperties {
    className?: string;
    international?: boolean;
    defaultCountry?: string;
    value?: string;
    onChange?: (value: string | undefined) => void;
  }
}

type FormData = {
    firstName: string; lastName: string; dateOfBirth: string; gender: string;
    email: string; phone: string; whatsappPhone?: string; address: string;
    occupation?: string; referralSource: string;
    emergencyContactName?: string; emergencyContactNumber?: string; emergencyContactRelation?: string;
    bloodGroup?: string; allergies?: string; medicalConditions?: string;
    privacyConsent: boolean; serviceConsent: boolean; medicalConsent: boolean;
};

type FieldName = keyof FormData;

type StepKey = 'about' | 'contact' | 'emergency' | 'guardian' | 'health' | 'review';

// `fields` are listed in on-screen order: the first invalid one is where the patient is taken.
const STEP_DEFS: Record<StepKey, { title: string; subtitle: string; fields: FieldName[] }> = {
    about: { title: 'About you', subtitle: 'As it appears on your ID.', fields: ['firstName', 'lastName', 'dateOfBirth', 'gender'] },
    contact: { title: 'Contact details', subtitle: 'So we can reach you about your care.', fields: ['phone', 'whatsappPhone', 'email', 'address', 'occupation', 'referralSource'] },
    emergency: { title: 'Emergency contact', subtitle: 'Someone we can call if we need to.', fields: ['emergencyContactName', 'emergencyContactNumber', 'emergencyContactRelation'] },
    guardian: {
        title: 'Parent or guardian',
        subtitle: 'As the patient is under 18, we will contact a parent or guardian about their care.',
        fields: ['emergencyContactName', 'emergencyContactNumber', 'emergencyContactRelation', 'address', 'phone', 'email', 'referralSource'],
    },
    health: { title: 'Health', subtitle: 'Helps the doctor prepare. Leave blank if unsure.', fields: ['bloodGroup', 'allergies', 'medicalConditions'] },
    review: { title: 'Review and submit', subtitle: 'Check the details before sending them to the front desk.', fields: ['privacyConsent', 'serviceConsent', 'medicalConsent'] },
};

// Minors get a single contact step: the guardian is both the main and the emergency contact.
const ADULT_FLOW: StepKey[] = ['about', 'contact', 'emergency', 'health', 'review'];
const MINOR_FLOW: StepKey[] = ['about', 'guardian', 'health', 'review'];

const DEFAULT_VALUES: FormData = {
    firstName: '', lastName: '', dateOfBirth: '', gender: '',
    email: '', phone: '', whatsappPhone: '', address: '',
    occupation: '', referralSource: '',
    emergencyContactName: '', emergencyContactNumber: '', emergencyContactRelation: '',
    bloodGroup: '', allergies: '', medicalConditions: '',
    privacyConsent: false, serviceConsent: false, medicalConsent: false,
};

const GENDER_OPTIONS = [
    { value: 'FEMALE', label: 'Female' },
    { value: 'MALE', label: 'Male' },
    { value: 'OTHER', label: 'Other' },
];
const REFERRAL_OPTIONS: { value: (typeof REFERRAL_SOURCES)[number]; label: string }[] = [
    { value: 'SOCIAL_MEDIA', label: 'Social media' },
    { value: 'GOOGLE_SEARCH', label: 'Google search' },
    { value: 'FRIEND_FAMILY', label: 'Friend or family' },
    { value: 'DOCTOR_REFERRAL', label: 'Doctor referral' },
    { value: 'WEBSITE', label: 'Our website' },
    { value: 'ADVERTISEMENT', label: 'Advertisement' },
    { value: 'WALK_IN', label: 'Walked past' },
    { value: 'OTHER', label: 'Other' },
];
const ADULT_RELATIONS = [
    { value: 'SPOUSE', label: 'Spouse' },
    { value: 'PARENT', label: 'Parent' },
    { value: 'SIBLING', label: 'Sibling' },
    { value: 'CHILD', label: 'Child' },
    { value: 'FRIEND', label: 'Friend' },
    { value: 'OTHER', label: 'Other' },
];
const GUARDIAN_RELATIONS = [
    { value: 'PARENT', label: 'Parent' },
    { value: 'SIBLING', label: 'Sibling' },
    { value: 'OTHER', label: 'Guardian' },
];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((v) => ({ value: v, label: v }));

const labelFor = (options: { value: string; label: string }[], value?: string) =>
    options.find((o) => o.value === value)?.label;

// One draft per device (not per session) so a patient whose session expires can
// restart and pick up where they left off. Consents are never restored.
const DRAFT_KEY = 'nsac_intake_draft_v1';
const DRAFT_TTL_MS = 12 * 60 * 60 * 1000;

function loadDraft(): Partial<FormData> | null {
    try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (!raw) return null;
        const { savedAt, data } = JSON.parse(raw) as { savedAt: number; data: Partial<FormData> };
        if (!savedAt || Date.now() - savedAt > DRAFT_TTL_MS) {
            localStorage.removeItem(DRAFT_KEY);
            return null;
        }
        const { privacyConsent: _p, serviceConsent: _s, medicalConsent: _m, ...rest } = data;
        return rest;
    } catch {
        return null;
    }
}

function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch { }
}

const inputClass =
    'h-[3.25rem] w-full rounded-xl border border-[#e7d6bf] bg-white px-4 text-base text-[#2c2e4b] shadow-sm ' +
    'placeholder:text-[#2c2e4b]/35 transition focus:border-[#caa26a] focus:outline-none focus:ring-4 focus:ring-[#caa26a]/15';
const errorInputClass = 'border-red-400 focus:border-red-400 focus:ring-red-100';
const textareaClass = cn(inputClass, 'h-auto min-h-[6rem] resize-none py-3 leading-relaxed');

function Field({
    name,
    label,
    htmlFor,
    optional,
    hint,
    error,
    children,
}: {
    name: FieldName;
    label: string;
    htmlFor?: string;
    optional?: boolean;
    hint?: ReactNode;
    error?: string;
    children: ReactNode;
}) {
    const LabelTag = htmlFor ? 'label' : 'p';
    return (
        <div data-field={name} className="scroll-mt-28 scroll-mb-40">
            <LabelTag {...(htmlFor ? { htmlFor } : {})} className="mb-2 flex items-baseline justify-between text-[15px] font-medium text-[#2c2e4b]">
                {label}
                {optional && <span className="text-xs font-normal text-[#2c2e4b]/45">Optional</span>}
            </LabelTag>
            {children}
            {error ? (
                <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-sm text-red-600">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {error}
                </p>
            ) : hint ? (
                <p className="mt-1.5 text-sm text-[#2c2e4b]/50">{hint}</p>
            ) : null}
        </div>
    );
}

function PhoneField({
    name,
    control,
    invalid,
    autoComplete,
}: {
    name: FieldName;
    control: any;
    invalid?: boolean;
    autoComplete?: string;
}) {
    return (
        <Controller
            name={name}
            control={control}
            render={({ field }) => (
                <div className="phone-input-wrapper intake-phone" data-invalid={invalid || undefined}>
                    <PhoneInput
                        {...field}
                        value={field.value as string}
                        international
                        defaultCountry="KE"
                        autoComplete={autoComplete}
                        className="phone-input-custom"
                        onChange={(value) => field.onChange(value ?? '')}
                    />
                </div>
            )}
        />
    );
}

function ReviewSection({ title, onEdit, rows }: { title: string; onEdit: () => void; rows: [string, ReactNode][] }) {
    return (
        <section className="rounded-2xl border border-[#e7d6bf] bg-white">
            <header className="flex items-center justify-between border-b border-[#e7d6bf]/70 px-4 py-3">
                <h3 className="text-sm font-semibold text-[#2c2e4b]">{title}</h3>
                <button
                    type="button"
                    onClick={onEdit}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-[#b8913e] active:bg-[#caa26a]/10"
                >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                </button>
            </header>
            <dl className="divide-y divide-[#e7d6bf]/50 px-4">
                {rows.map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4 py-2.5 text-sm">
                        <dt className="shrink-0 text-[#2c2e4b]/55">{label}</dt>
                        <dd className="min-w-0 text-right font-medium text-[#2c2e4b] [overflow-wrap:anywhere]">
                            {value || <span className="font-normal text-[#2c2e4b]/30">Not provided</span>}
                        </dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}

function minutesUntil(expiresAt: string): number {
    return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 60000));
}

export function MobileIntakeForm({
    sessionId,
    expiresAt,
}: {
    sessionId: string;
    expiresAt: string;
}) {
    const [stepIndex, setStepIndex] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState<{ firstName?: string; fileNumber?: string } | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [expired, setExpired] = useState(() => minutesUntil(expiresAt) <= 0);
    const [minutesLeft, setMinutesLeft] = useState(() => minutesUntil(expiresAt));

    // Errors only appear after the patient presses Continue / Submit, never on
    // focus changes; once shown, they clear live as the field is corrected.
    const form = useForm<FormData>({
        resolver: zodResolver(PublicIntakeSubmissionSchema) as any,
        mode: 'onSubmit',
        reValidateMode: 'onChange',
        defaultValues: DEFAULT_VALUES,
    });

    const { register, control, formState: { errors }, trigger, getValues, watch, setValue, setError } = form;
    const values = watch();

    const age = values.dateOfBirth ? calculateAge(values.dateOfBirth) : -1;
    const isMinor = age >= 0 && age < 18;
    const flow = isMinor ? MINOR_FLOW : ADULT_FLOW;
    const flowFields = flow.flatMap((key) => STEP_DEFS[key].fields);
    const step = Math.min(stepIndex, flow.length - 1);
    const stepKey = flow[step];
    const isLastStep = step === flow.length - 1;

    useEffect(() => {
        const draft = loadDraft();
        if (draft) form.reset({ ...DEFAULT_VALUES, ...draft });
    }, [form]);

    useEffect(() => {
        const sub = form.watch((data, { name }) => {
            try {
                localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: Date.now(), data }));
            } catch { }
            if (name && form.getFieldState(name as FieldName).error) {
                void form.trigger(name as FieldName);
            }
        });
        return () => sub.unsubscribe();
    }, [form]);

    // Recompute from the absolute expiry time: mobile browsers pause timers
    // while the screen is locked, so counting down an interval drifts.
    useEffect(() => {
        const tick = () => {
            const left = minutesUntil(expiresAt);
            setMinutesLeft(left);
            if (left <= 0) setExpired(true);
        };
        const interval = setInterval(tick, 30_000);
        document.addEventListener('visibilitychange', tick);
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', tick);
        };
    }, [expiresAt]);

    const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

    const goTo = useCallback((target: number, options: { scroll?: boolean } = {}) => {
        setStepIndex(target);
        setSubmitError(null);
        if (options.scroll !== false) scrollTop();
    }, []);

    // Chips and the consent box aren't registered inputs, so react-hook-form
    // can't focus them; every field wrapper carries data-field for this instead.
    const revealField = (name: FieldName) => {
        setTimeout(() => {
            const wrapper = document.querySelector<HTMLElement>(`[data-field="${name}"]`);
            if (!wrapper) return;
            wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
            wrapper
                .querySelector<HTMLElement>('input:not([type="hidden"]), select, textarea, button')
                ?.focus({ preventScroll: true });
        }, 80);
    };

    const firstInvalidField = (fields: FieldName[]) => fields.find((f) => form.getFieldState(f).error);

    /**
     * Jump to the step holding the first invalid field and bring that field into
     * view. Only fields on the current flow count, so a stale value in a field the
     * patient can no longer see (e.g. after changing the date of birth) never blocks them.
     */
    const showFirstInvalid = (fields: FieldName[] = flowFields) => {
        const name = firstInvalidField(fields);
        if (!name) return false;
        const target = flow.findIndex((key) => STEP_DEFS[key].fields.includes(name));
        if (target !== step) goTo(target, { scroll: false });
        revealField(name);
        return true;
    };

    const goNext = async () => {
        const fields = STEP_DEFS[stepKey].fields;
        await trigger(fields);
        if (!showFirstInvalid(fields)) goTo(Math.min(step + 1, flow.length - 1));
    };

    const handleSubmit = async () => {
        if (submitting) return;
        setSubmitError(null);

        await trigger();
        if (showFirstInvalid()) return;

        setSubmitting(true);
        try {
            const raw = getValues();
            const clean = Object.fromEntries(
                flowFields.map((f) => [f, raw[f]] as const).filter(([, v]) => v !== '' && v !== undefined),
            );
            const res = await fetch('/api/patient/intake', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, ...clean }),
            });
            const body = await res.json().catch(() => ({}));

            if (res.ok) {
                clearDraft();
                setSubmitted({ firstName: body.firstName, fileNumber: body.fileNumber });
                scrollTop();
                return;
            }

            if (body.code === 'SESSION_EXPIRED') {
                setExpired(true);
                return;
            }
            if (body.code === 'SESSION_ALREADY_SUBMITTED') {
                clearDraft();
                setSubmitted({ firstName: raw.firstName });
                return;
            }
            if (body.code === 'VALIDATION_ERROR' && body.fieldErrors) {
                const names = Object.keys(body.fieldErrors);
                for (const name of names) {
                    const message = body.fieldErrors[name]?.[0];
                    if (message) setError(name as FieldName, { type: 'server', message });
                }
                if (showFirstInvalid()) return;
            }
            setSubmitError(body.error || 'Something went wrong. Please try again.');
        } catch {
            setSubmitError('No connection. Check your internet and tap Submit again. Your answers are saved.');
        } finally {
            setSubmitting(false);
        }
    };

    const onFormSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!isLastStep) void goNext();
        else void handleSubmit();
    };

    if (!submitted && expired) {
        return (
            <IntakeStatusScreen
                icon={<Clock className="h-9 w-9" />}
                tone="warning"
                title="This form timed out"
                message="For your privacy, forms expire after a while. Your answers are saved on this phone, so you can carry on where you left off."
                action={{ href: '/intake', label: 'Continue my form' }}
                footnote="Nothing has been submitted yet."
            />
        );
    }

    if (submitted) {
        return (
            <IntakeStatusScreen
                icon={<Check className="h-10 w-10" strokeWidth={2.5} />}
                tone="success"
                title={submitted.firstName ? `Thank you, ${submitted.firstName}` : 'Thank you'}
                message="Your details have been received and you're now registered with Nairobi Sculpt."
            >
                {submitted.fileNumber && (
                    <div className="mt-6 w-full rounded-2xl border border-[#caa26a]/60 bg-white px-6 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b8913e]">Your file number</p>
                        <p className="mt-1 font-mono text-3xl font-semibold tracking-wider text-[#2c2e4b]">{submitted.fileNumber}</p>
                    </div>
                )}
                <ol className="mt-6 w-full space-y-3 text-left">
                    {[
                        { icon: BellRing, text: 'The front desk has been notified that you are here.' },
                        { icon: Armchair, text: 'Please take a seat. We will call your name shortly.' },
                        { icon: Lock, text: 'You can close this page. Your details are stored securely.' },
                    ].map(({ icon: Icon, text }) => (
                        <li key={text} className="flex items-start gap-3 rounded-xl bg-white px-4 py-3 text-[15px] text-[#2c2e4b]">
                            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#caa26a]" />
                            {text}
                        </li>
                    ))}
                </ol>
            </IntakeStatusScreen>
        );
    }

    const { title: stepTitle, subtitle: stepSubtitle } = STEP_DEFS[stepKey];
    const relationOptions = isMinor ? GUARDIAN_RELATIONS : ADULT_RELATIONS;
    const editStep = (key: StepKey) => goTo(flow.indexOf(key));

    const emailInput = (
        <input
            id="email"
            {...register('email')}
            type="email"
            inputMode="email"
            autoComplete={isMinor ? 'off' : 'email'}
            autoCapitalize="none"
            enterKeyHint="next"
            placeholder="e.g. wanjiru@gmail.com"
            className={cn(inputClass, errors.email && errorInputClass)}
        />
    );
    const addressInput = (
        <input
            id="address"
            {...register('address')}
            autoComplete="street-address"
            enterKeyHint="next"
            placeholder="e.g. Kilimani, Nairobi"
            className={cn(inputClass, errors.address && errorInputClass)}
        />
    );
    const referralField = (
        <Field name="referralSource" label="How did you hear about us?" optional error={errors.referralSource?.message}>
            <ChoiceChips
                name="How did you hear about us?"
                value={values.referralSource}
                onChange={(v) => setValue('referralSource', v, { shouldDirty: true })}
                options={REFERRAL_OPTIONS}
                columns={2}
                allowDeselect
            />
        </Field>
    );
    const patientFirstName = values.firstName?.trim() || 'the patient';
    const dobLabel = values.dateOfBirth && !Number.isNaN(new Date(values.dateOfBirth).getTime())
        ? format(new Date(`${values.dateOfBirth}T12:00:00`), 'd MMMM yyyy')
        : null;

    return (
        <div className="min-h-[100dvh] bg-[#f7f4ef]">
            <header className="sticky top-0 z-20 border-b border-[#e7d6bf]/70 bg-white/95 backdrop-blur">
                <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-3">
                    <IntakeLogo />
                    <span className="rounded-full bg-[#f7f4ef] px-3 py-1 text-xs font-semibold text-[#2c2e4b]/70 tabular-nums">
                        {step + 1} of {flow.length}
                    </span>
                </div>
                <div className="mx-auto flex max-w-lg gap-1.5 px-5 pb-3" aria-hidden>
                    {flow.map((key, i) => (
                        <div
                            key={key}
                            className={cn(
                                'h-1 flex-1 rounded-full transition-colors duration-300',
                                i <= step ? 'bg-[#caa26a]' : 'bg-[#e7d6bf]/60',
                            )}
                        />
                    ))}
                </div>
            </header>

            <form noValidate onSubmit={onFormSubmit} className="mx-auto max-w-lg px-5 pb-36 pt-6">
                {stepKey === 'about' && (
                    <div className="mb-6 rounded-2xl bg-[#2c2e4b] px-5 py-4 text-white">
                        <p className="text-[15px] font-semibold">Welcome to Nairobi Sculpt</p>
                        <p className="mt-1 text-sm leading-relaxed text-white/70">
                            This takes about 3 minutes. When you submit, your details go straight to our front desk.
                        </p>
                    </div>
                )}

                <div className="mb-6">
                    <h1 className="text-[1.65rem] font-semibold leading-tight tracking-tight text-[#2c2e4b]">{stepTitle}</h1>
                    <p className="mt-1.5 text-[15px] text-[#2c2e4b]/60">{stepSubtitle}</p>
                    {minutesLeft > 0 && minutesLeft <= 5 && (
                        <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                            <Clock className="h-4 w-4" />
                            This form expires in {minutesLeft} minute{minutesLeft !== 1 ? 's' : ''}. Your answers are saved.
                        </p>
                    )}
                </div>

                <div className="space-y-6">
                    {stepKey === 'about' && (
                        <>
                            <Field name="firstName" label="First name" htmlFor="firstName" error={errors.firstName?.message}>
                                <input
                                    id="firstName"
                                    {...register('firstName')}
                                    placeholder="e.g. Wanjiru"
                                    autoComplete="given-name"
                                    autoCapitalize="words"
                                    enterKeyHint="next"
                                    className={cn(inputClass, errors.firstName && errorInputClass)}
                                />
                            </Field>
                            <Field name="lastName" label="Last name" htmlFor="lastName" error={errors.lastName?.message}>
                                <input
                                    id="lastName"
                                    {...register('lastName')}
                                    placeholder="e.g. Kamau"
                                    autoComplete="family-name"
                                    autoCapitalize="words"
                                    enterKeyHint="next"
                                    className={cn(inputClass, errors.lastName && errorInputClass)}
                                />
                            </Field>
                            <Field
                                name="dateOfBirth"
                                label="Date of birth"
                                error={errors.dateOfBirth?.message}
                                hint={age >= 0 ? `Age ${age}` : undefined}
                            >
                                <Controller
                                    name="dateOfBirth"
                                    control={control}
                                    render={({ field }) => (
                                        <DateOfBirthField
                                            value={field.value}
                                            onChange={field.onChange}
                                            invalid={!!errors.dateOfBirth}
                                            inputClassName={inputClass}
                                        />
                                    )}
                                />
                            </Field>
                            <Field name="gender" label="Gender" error={errors.gender?.message}>
                                <ChoiceChips
                                    name="Gender"
                                    value={values.gender}
                                    onChange={(v) => setValue('gender', v, { shouldDirty: true })}
                                    options={GENDER_OPTIONS}
                                    invalid={!!errors.gender}
                                />
                            </Field>
                        </>
                    )}

                    {stepKey === 'contact' && (
                        <>
                            <Field name="phone" label="Phone number" error={errors.phone?.message}>
                                <PhoneField name="phone" control={control} invalid={!!errors.phone} autoComplete="tel" />
                            </Field>
                            <Field name="whatsappPhone" label="WhatsApp number" optional error={errors.whatsappPhone?.message}>
                                <PhoneField name="whatsappPhone" control={control} invalid={!!errors.whatsappPhone} />
                                {values.phone && values.whatsappPhone !== values.phone && (
                                    <button
                                        type="button"
                                        onClick={() => setValue('whatsappPhone', values.phone, { shouldDirty: true })}
                                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-medium text-[#b8913e] active:bg-[#caa26a]/10"
                                    >
                                        <Check className="h-4 w-4" />
                                        Same as my phone number
                                    </button>
                                )}
                            </Field>
                            <Field name="email" label="Email" htmlFor="email" error={errors.email?.message}>
                                {emailInput}
                            </Field>
                            <Field name="address" label="Home address" htmlFor="address" error={errors.address?.message} hint="Area and town is enough.">
                                {addressInput}
                            </Field>
                            <Field name="occupation" label="Occupation" htmlFor="occupation" optional error={errors.occupation?.message}>
                                <input
                                    id="occupation"
                                    {...register('occupation')}
                                    autoComplete="organization-title"
                                    enterKeyHint="done"
                                    placeholder="e.g. Accountant"
                                    className={cn(inputClass, errors.occupation && errorInputClass)}
                                />
                            </Field>
                            {referralField}
                        </>
                    )}

                    {(stepKey === 'emergency' || stepKey === 'guardian') && (
                        <>
                            <Field
                                name="emergencyContactName"
                                label={isMinor ? "Parent or guardian's full name" : 'Full name'}
                                htmlFor="emergencyContactName"
                                optional
                                error={errors.emergencyContactName?.message}
                            >
                                <input
                                    id="emergencyContactName"
                                    {...register('emergencyContactName')}
                                    placeholder="e.g. Grace Kamau"
                                    autoCapitalize="words"
                                    enterKeyHint="next"
                                    className={cn(inputClass, errors.emergencyContactName && errorInputClass)}
                                />
                            </Field>
                            <Field
                                name="emergencyContactNumber"
                                label={isMinor ? "Parent or guardian's phone number" : 'Phone number'}
                                optional={!isMinor || !!values.phone}
                                error={errors.emergencyContactNumber?.message}
                            >
                                <PhoneField
                                    name="emergencyContactNumber"
                                    control={control}
                                    invalid={!!errors.emergencyContactNumber}
                                />
                            </Field>
                            <Field
                                name="emergencyContactRelation"
                                label={isMinor ? 'Relationship to the patient' : 'Relationship to you'}
                                optional
                                error={errors.emergencyContactRelation?.message}
                            >
                                <ChoiceChips
                                    name="Relationship"
                                    value={values.emergencyContactRelation}
                                    onChange={(v) => setValue('emergencyContactRelation', v, { shouldDirty: true })}
                                    options={relationOptions}
                                    invalid={!!errors.emergencyContactRelation}
                                    allowDeselect
                                />
                            </Field>
                        </>
                    )}

                    {stepKey === 'guardian' && (
                        <>
                            <Field name="address" label="Home address" htmlFor="address" optional error={errors.address?.message} hint="Area and town is enough.">
                                {addressInput}
                            </Field>

                            <div className="space-y-6 rounded-2xl border border-dashed border-[#e7d6bf] p-4">
                                <div>
                                    <p className="text-[15px] font-medium text-[#2c2e4b]">{patientFirstName}&apos;s own contact</p>
                                    <p className="mt-0.5 text-sm text-[#2c2e4b]/55">
                                        Only if they have their own phone or email. Leave blank otherwise.
                                    </p>
                                </div>
                                <Field name="phone" label="Phone number" optional error={errors.phone?.message}>
                                    <PhoneField name="phone" control={control} invalid={!!errors.phone} />
                                </Field>
                                <Field name="email" label="Email" htmlFor="email" optional error={errors.email?.message}>
                                    {emailInput}
                                </Field>
                            </div>

                            {referralField}
                        </>
                    )}

                    {stepKey === 'health' && (
                        <>
                            <Field name="bloodGroup" label="Blood group" optional>
                                <ChoiceChips
                                    name="Blood group"
                                    value={values.bloodGroup}
                                    onChange={(v) => setValue('bloodGroup', v, { shouldDirty: true })}
                                    options={BLOOD_GROUPS}
                                    columns={4}
                                    allowDeselect
                                />
                            </Field>
                            <Field
                                name="allergies"
                                label="Allergies"
                                htmlFor="allergies"
                                optional
                                error={errors.allergies?.message}
                                hint="Medicines, foods, latex, plasters…"
                            >
                                <textarea
                                    id="allergies"
                                    {...register('allergies')}
                                    rows={3}
                                    maxLength={500}
                                    placeholder="e.g. Penicillin"
                                    className={cn(textareaClass, errors.allergies && errorInputClass)}
                                />
                            </Field>
                            <Field
                                name="medicalConditions"
                                label="Medical conditions"
                                htmlFor="medicalConditions"
                                optional
                                error={errors.medicalConditions?.message}
                                hint="Anything you're being treated for, or medicines you take regularly."
                            >
                                <textarea
                                    id="medicalConditions"
                                    {...register('medicalConditions')}
                                    rows={3}
                                    maxLength={500}
                                    placeholder="e.g. High blood pressure"
                                    className={cn(textareaClass, errors.medicalConditions && errorInputClass)}
                                />
                            </Field>
                        </>
                    )}

                    {stepKey === 'review' && (
                        <>
                            <ReviewSection
                                title={isMinor ? 'About the patient' : 'About you'}
                                onEdit={() => editStep('about')}
                                rows={[
                                    ['Name', `${values.firstName} ${values.lastName}`.trim()],
                                    ['Date of birth', dobLabel],
                                    ['Gender', labelFor(GENDER_OPTIONS, values.gender)],
                                ]}
                            />
                            {isMinor ? (
                                <ReviewSection
                                    title="Parent or guardian"
                                    onEdit={() => editStep('guardian')}
                                    rows={[
                                        ['Name', values.emergencyContactName],
                                        ['Phone', values.emergencyContactNumber],
                                        ['Relationship', labelFor(relationOptions, values.emergencyContactRelation)],
                                        ['Address', values.address],
                                        [`${patientFirstName}'s phone`, values.phone],
                                        [`${patientFirstName}'s email`, values.email],
                                        ['Heard about us', labelFor(REFERRAL_OPTIONS, values.referralSource)],
                                    ]}
                                />
                            ) : (
                                <>
                                    <ReviewSection
                                        title="Contact details"
                                        onEdit={() => editStep('contact')}
                                        rows={[
                                            ['Phone', values.phone],
                                            ['WhatsApp', values.whatsappPhone],
                                            ['Email', values.email],
                                            ['Address', values.address],
                                            ['Heard about us', labelFor(REFERRAL_OPTIONS, values.referralSource)],
                                        ]}
                                    />
                                    <ReviewSection
                                        title="Emergency contact"
                                        onEdit={() => editStep('emergency')}
                                        rows={[
                                            ['Name', values.emergencyContactName],
                                            ['Phone', values.emergencyContactNumber],
                                            ['Relationship', labelFor(relationOptions, values.emergencyContactRelation)],
                                        ]}
                                    />
                                </>
                            )}
                            <ReviewSection
                                title="Health"
                                onEdit={() => editStep('health')}
                                rows={[
                                    ['Blood group', values.bloodGroup],
                                    ['Allergies', values.allergies],
                                    ['Conditions', values.medicalConditions],
                                ]}
                            />

                            <div data-field="privacyConsent" className="scroll-mb-40 space-y-1.5">
                                <label
                                    className={cn(
                                        'flex cursor-pointer items-center gap-3 rounded-2xl border bg-white p-4 transition',
                                        values.privacyConsent ? 'border-[#caa26a] ring-4 ring-[#caa26a]/10' : errors.privacyConsent ? 'border-red-300' : 'border-[#e7d6bf]',
                                    )}
                                >
                                    <input
                                        type="checkbox"
                                        checked={!!values.privacyConsent}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            const opts = { shouldDirty: true, shouldValidate: !!errors.privacyConsent };
                                            setValue('privacyConsent', checked, opts);
                                            setValue('serviceConsent', checked, opts);
                                            setValue('medicalConsent', checked, opts);
                                            if (checked) setSubmitError(null);
                                        }}
                                        className="h-6 w-6 shrink-0 rounded accent-[#2c2e4b]"
                                    />
                                    <span className="text-[15px] leading-relaxed text-[#2c2e4b]">
                                        My details are correct and may be used for my care.
                                    </span>
                                </label>
                                {errors.privacyConsent && (
                                    <p role="alert" className="flex items-center gap-1.5 text-sm text-red-600">
                                        <AlertCircle className="h-3.5 w-3.5" />
                                        {errors.privacyConsent.message}
                                    </p>
                                )}
                            </div>
                        </>
                    )}

                    <IntakeTrustFooter className="pt-2" />
                </div>

                <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#e7d6bf]/70 bg-white/95 px-5 pt-3 backdrop-blur pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                    {submitError && (
                        <p
                            aria-live="assertive"
                            className="mx-auto mb-3 flex max-w-lg items-start gap-2 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700"
                        >
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                            {submitError}
                        </p>
                    )}
                    <div className="mx-auto flex max-w-lg gap-3">
                        {step > 0 && (
                            <button
                                type="button"
                                onClick={() => goTo(step - 1)}
                                aria-label="Back"
                                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#e7d6bf] bg-white text-[#2c2e4b] transition active:scale-[0.97]"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={submitting}
                            className={cn(
                                'flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl text-base font-semibold shadow-sm transition active:scale-[0.99]',
                                submitting
                                    ? 'cursor-not-allowed bg-[#2c2e4b]/70 text-white'
                                    : 'bg-[#2c2e4b] text-white',
                            )}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Sending your details…
                                </>
                            ) : isLastStep ? 'Submit to front desk' : 'Continue'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
