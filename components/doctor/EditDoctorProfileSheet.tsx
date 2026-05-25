'use client';

/**
 * Edit Doctor Profile Sheet (Modern Drawer)
 * 
 * enhanced profile management with validation and categorized tabs.
 */

import { useMemo, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { doctorApi } from '@/lib/api/doctor';
import type { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';
import { User, MapPin, Award, GraduationCap, Globe, Clock } from 'lucide-react';
import { ImageUpload } from '@/components/ui/image-upload';

const TITLE_OPTIONS = ['Dr.', 'Prof.', 'Mr.', 'Mrs.', 'Ms.'] as const;
const SPECIALIZATION_OPTIONS = [
    'Plastic & Reconstructive Surgery',
    'Cosmetic Surgery',
    'Dermatology',
    'General Surgery',
    'Anesthesiology',
    'Internal Medicine',
    'Other',
] as const;
const LANGUAGE_PRESETS = [
    'English',
    'Kiswahili',
    'English, Kiswahili',
    'Other',
] as const;

const profileSchema = z.object({
    specialization: z.string().min(2, 'Specialization is required'),
    title: z.string().optional(),
    yearsOfExperience: z.coerce.number().min(0).optional(),
    languages: z.string().optional(),

    // Contact
    clinicLocation: z.string().optional(),

    // Bio
    bio: z.string().optional(),
    profileImage: z.string().optional(),

    // Professional
    education: z.string().optional(),
    focusAreas: z.string().optional(),
    professionalAffiliations: z.string().optional(),
    consultationFee: z.coerce.number().min(0).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface EditDoctorProfileSheetProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    doctor: DoctorResponseDto;
}

type StepKey = 'general' | 'details' | 'professional';

export function EditDoctorProfileSheet({
    open,
    onClose,
    onSuccess,
    doctor,
}: EditDoctorProfileSheetProps) {
    const [step, setStep] = useState<StepKey>('general');

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            specialization: doctor.specialization || '',
            title: doctor.title || '',
            yearsOfExperience: doctor.yearsOfExperience || 0,
            languages: doctor.languages || '',
            clinicLocation: doctor.clinicLocation || '',
            bio: doctor.bio || '',
            profileImage: doctor.profileImage || '',
            education: doctor.education || '',
            focusAreas: doctor.focusAreas || '',
            professionalAffiliations: doctor.professionalAffiliations || '',
            consultationFee: doctor.consultationFee || 0,
        },
    });

    // Reset form when doctor prop changes
    useEffect(() => {
        if (open) {
            setStep('general');
            form.reset({
                specialization: doctor.specialization || '',
                title: doctor.title || '',
                yearsOfExperience: doctor.yearsOfExperience || 0,
                languages: doctor.languages || '',
                clinicLocation: doctor.clinicLocation || '',
                bio: doctor.bio || '',
                profileImage: doctor.profileImage || '',
                education: doctor.education || '',
                focusAreas: doctor.focusAreas || '',
                professionalAffiliations: doctor.professionalAffiliations || '',
                consultationFee: doctor.consultationFee || 0,
            });
        }
    }, [open, doctor, form]);

    async function onSubmit(data: ProfileFormValues) {
        try {
            if (!form.formState.isDirty) {
                toast.message('No changes to save');
                return;
            }

            const result = await doctorApi.updateProfile({
                ...data,
                // Ensure number fields are numbers
                yearsOfExperience: Number(data.yearsOfExperience),
                consultationFee: Number(data.consultationFee),
            });

            if (result.success) {
                toast.success('Profile updated successfully');
                onSuccess();
                form.reset(data);
            } else {
                toast.error(result.error || 'Failed to update profile');
            }
        } catch (error) {
            toast.error('An error occurred while saving');
            console.error(error);
        }
    }

    const stepFields = useMemo<Record<StepKey, Array<keyof ProfileFormValues>>>(() => ({
        general: [
            'title',
            'specialization',
            'yearsOfExperience',
            'languages',
            'clinicLocation',
            'consultationFee',
        ],
        details: [
            'profileImage',
            'bio',
        ],
        professional: [
            'education',
            'focusAreas',
            'professionalAffiliations',
        ],
    }), []);

    const stepOrder: StepKey[] = ['general', 'details', 'professional'];
    const stepIndex = stepOrder.indexOf(step);
    const isFirst = stepIndex === 0;
    const isLast = stepIndex === stepOrder.length - 1;

    const goNext = async () => {
        const ok = await form.trigger(stepFields[step], { shouldFocus: true });
        if (!ok) return;
        setStep(stepOrder[Math.min(stepIndex + 1, stepOrder.length - 1)]);
    };

    const goBack = () => {
        setStep(stepOrder[Math.max(stepIndex - 1, 0)]);
    };

    return (
        <Sheet open={open} onOpenChange={onClose}>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle>Edit Professional Profile</SheetTitle>
                    <SheetDescription>
                        Update your details. Use Next/Back to move through sections, then save.
                    </SheetDescription>
                </SheetHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Step indicator */}
                        <div className="border border-slate-200 bg-white px-4 py-3">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                Step {stepIndex + 1} of {stepOrder.length}
                            </div>
                            <div className="text-sm font-semibold text-slate-900 mt-1">
                                {step === 'general' ? 'General' : step === 'details' ? 'Details' : 'Professional'}
                            </div>
                        </div>

                        {step === 'general' && (
                            <div className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => {
                                        const selectedTitle =
                                            field.value && (TITLE_OPTIONS as readonly string[]).includes(field.value)
                                                ? field.value
                                                : 'Other';
                                        return (
                                            <FormItem>
                                                <FormLabel>Title (Optional)</FormLabel>
                                                <FormControl>
                                                    <div className="space-y-2">
                                                        <Select
                                                            value={selectedTitle}
                                                            onValueChange={(value) => {
                                                                if (value === 'Other') {
                                                                    field.onChange('');
                                                                    return;
                                                                }
                                                                field.onChange(value);
                                                            }}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select title" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {TITLE_OPTIONS.map((opt) => (
                                                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                                ))}
                                                                <SelectItem value="Other">Other</SelectItem>
                                                            </SelectContent>
                                                        </Select>

                                                        {selectedTitle === 'Other' && (
                                                            <Input
                                                                placeholder="Enter title"
                                                                value={field.value || ''}
                                                                onChange={(e) => field.onChange(e.target.value)}
                                                            />
                                                        )}
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        );
                                    }}
                                />

                                <FormField
                                    control={form.control}
                                    name="specialization"
                                    render={({ field }) => {
                                        const selectedSpecialization =
                                            field.value && (SPECIALIZATION_OPTIONS as readonly string[]).includes(field.value)
                                                ? field.value
                                                : 'Other';

                                        return (
                                            <FormItem>
                                                <FormLabel>Specialization *</FormLabel>
                                                <FormControl>
                                                    <div className="space-y-2">
                                                        <Select
                                                            value={selectedSpecialization}
                                                            onValueChange={(value) => {
                                                                if (value === 'Other') {
                                                                    if ((SPECIALIZATION_OPTIONS as readonly string[]).includes(field.value)) {
                                                                        field.onChange('');
                                                                    }
                                                                    return;
                                                                }
                                                                field.onChange(value);
                                                            }}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select specialization" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {SPECIALIZATION_OPTIONS.map((opt) => (
                                                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>

                                                        {selectedSpecialization === 'Other' && (
                                                            <Input
                                                                placeholder="Enter specialization"
                                                                value={field.value || ''}
                                                                onChange={(e) => field.onChange(e.target.value)}
                                                            />
                                                        )}
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        );
                                    }}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="yearsOfExperience"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Years of Experience (Optional)</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input type="number" className="pl-9" {...field} />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                    <FormField
                                        control={form.control}
                                        name="languages"
                                    render={({ field }) => {
                                            const selectedPreset =
                                                field.value && (LANGUAGE_PRESETS as readonly string[]).includes(field.value)
                                                    ? field.value
                                                    : 'Other';

                                            return (
                                                <FormItem>
                                                    <FormLabel>Languages (Optional)</FormLabel>
                                                    <FormControl>
                                                        <div className="space-y-2">
                                                            <Select
                                                                value={selectedPreset}
                                                                onValueChange={(value) => {
                                                                    if (value === 'Other') {
                                                                        if ((LANGUAGE_PRESETS as readonly string[]).includes(field.value || '')) {
                                                                            field.onChange('');
                                                                        }
                                                                        return;
                                                                    }
                                                                    field.onChange(value);
                                                                }}
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select languages" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {LANGUAGE_PRESETS.map((opt) => (
                                                                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>

                                                            {selectedPreset === 'Other' && (
                                                                <Input
                                                                    placeholder="e.g. English, Kiswahili"
                                                                    value={field.value || ''}
                                                                    onChange={(e) => field.onChange(e.target.value)}
                                                                />
                                                            )}
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            );
                                        }}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="clinicLocation"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Clinic Location (Optional)</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input className="pl-9" placeholder="Building, Room Number" {...field} />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="consultationFee"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Consultation Fee (KSH) (Optional)</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-2.5 text-xs font-semibold text-muted-foreground">
                                                        KSh
                                                    </span>
                                                    <Input type="number" className="pl-12" placeholder="e.g. 5000" {...field} />
                                                </div>
                                            </FormControl>
                                            <FormDescription>Default consultation fee applied to the charge sheet unless itemized billing is provided.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                        {step === 'details' && (
                            <div className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="profileImage"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Profile Image (Optional)</FormLabel>
                                            <FormControl>
                                                <ImageUpload
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    disabled={form.formState.isSubmitting}
                                                    variant="avatar"
                                                    label="Profile Photo"
                                                    subtitle="Professional headshot"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="bio"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Biography (Optional)</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Add internal notes about your background, style, and clinical focus…"
                                                    className="resize-none"
                                                    rows={6}
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                        {step === 'professional' && (
                            <div className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="education"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Education & Qualifications (Optional)</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Medical School, Residency, Fellowships..."
                                                    rows={4}
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="focusAreas"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Clinical Focus Areas (Optional)</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Specific procedures or conditions you specialize in..."
                                                    rows={3}
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="professionalAffiliations"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Professional Affiliations (Optional)</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Medical Boards, Societies..."
                                                    rows={3}
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                        <div className="flex items-center justify-between gap-3 pt-6 border-t border-slate-200">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Close
                            </Button>
                            <div className="flex items-center gap-2">
                                <Button type="button" variant="outline" onClick={goBack} disabled={isFirst}>
                                    Back
                                </Button>
                                {isLast ? (
                                    <Button type="submit" disabled={form.formState.isSubmitting}>
                                        {form.formState.isSubmitting ? 'Saving...' : 'Save changes'}
                                    </Button>
                                ) : (
                                    <Button type="button" onClick={goNext}>
                                        Next
                                    </Button>
                                )}
                            </div>
                        </div>
                    </form>
                </Form>
            </SheetContent>
        </Sheet>
    );
}
