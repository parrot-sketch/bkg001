'use client';

/**
 * Edit Doctor Profile Sheet (Modern Drawer)
 * 
 * enhanced profile management with validation and categorized tabs.
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetFooter
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { doctorApi } from '@/lib/api/doctor';
import type { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';
import { User, Stethoscope, MapPin, DollarSign, Award, GraduationCap, Globe, Clock } from 'lucide-react';
import { ImageUpload } from '@/components/ui/image-upload';

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

export function EditDoctorProfileSheet({
    open,
    onClose,
    onSuccess,
    doctor,
}: EditDoctorProfileSheetProps) {
    const [activeTab, setActiveTab] = useState('basic');

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
            const result = await doctorApi.updateProfile({
                ...data,
                // Ensure number fields are numbers
                yearsOfExperience: Number(data.yearsOfExperience),
                consultationFee: Number(data.consultationFee),
            });

            if (result.success) {
                toast.success('Profile updated successfully');
                onSuccess();
                onClose();
            } else {
                toast.error(result.error || 'Failed to update profile');
            }
        } catch (error) {
            toast.error('An error occurred while saving');
            console.error(error);
        }
    }

    return (
        <Sheet open={open} onOpenChange={onClose}>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle>Edit Professional Profile</SheetTitle>
                    <SheetDescription>
                        Manage your public doctor profile, specialty information, and biography.
                    </SheetDescription>
                </SheetHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="basic">General</TabsTrigger>
                                <TabsTrigger value="details">Details</TabsTrigger>
                                <TabsTrigger value="professional">Professional</TabsTrigger>
                            </TabsList>

                            {/* TAB: IDENTITY & BASIC */}
                            <TabsContent value="basic" className="space-y-4 pt-4">
                                <FormField
                                    control={form.control}
                                    name="specialization"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Specialization *</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Stethoscope className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input className="pl-9" placeholder="e.g. Cardiologist" {...field} />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="yearsOfExperience"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Years of Experience</FormLabel>
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
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Languages</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                        <Input className="pl-9" placeholder="English, Kiswahili" {...field} />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="clinicLocation"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Clinic Location</FormLabel>
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
                                            <FormLabel>Consultation Fee (KES)</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input type="number" className="pl-9" placeholder="e.g. 5000" {...field} />
                                                </div>
                                            </FormControl>
                                            <FormDescription>Standard consultation fee displayed to patients.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </TabsContent>

                            {/* TAB: DETAILS (BIO & IMAGE) */}
                            <TabsContent value="details" className="space-y-4 pt-4">
                                <FormField
                                    control={form.control}
                                    name="profileImage"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Profile Image</FormLabel>
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
                                            <FormLabel>Biography</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Tell patients about your background and philosophy..."
                                                    className="resize-none"
                                                    rows={6}
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </TabsContent>

                            {/* TAB: PROFESSIONAL INFO */}
                            <TabsContent value="professional" className="space-y-4 pt-4">
                                <FormField
                                    control={form.control}
                                    name="education"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Education & Qualifications</FormLabel>
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
                                            <FormLabel>Clinical Focus Areas</FormLabel>
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
                                            <FormLabel>Professional Affiliations</FormLabel>
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
                            </TabsContent>
                        </Tabs>

                        <div className="flex justify-end gap-3 pt-6">
                            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </SheetContent>
        </Sheet>
    );
}
