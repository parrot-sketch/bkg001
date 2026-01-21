'use client';

/**
 * Patient Profile Page
 * 
 * Modern mobile-first clinical patient profile management.
 * Designed for real patients using phones in clinical settings.
 * 
 * Design Principles:
 * - Mobile-first: Optimized for touch, generous spacing, clear hierarchy
 * - Clinical aesthetic: Calm, trustworthy, professional
 * - Reduced cognitive load: Clear sections, progressive disclosure
 * - Accessibility: Large touch targets, clear labels, sufficient contrast
 */

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { apiClient } from '@/lib/api/client';
import { patientApi } from '@/lib/api/patient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { User, Mail, Phone, MapPin, Calendar, AlertCircle, CheckCircle2, Info, Heart, Shield, FileText } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { toast } from 'sonner';
import { Gender } from '@/domain/enums/Gender';
import { format } from 'date-fns';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { CreatePatientDto } from '@/application/dtos/CreatePatientDto';

interface ProfileCompleteness {
  score: number; // 0-100
  missingCritical: string[];
  missingOptional: string[];
}

/**
 * Calculate profile completeness score
 */
function calculateCompleteness(patient: PatientResponseDto | null, formData: Partial<CreatePatientDto>, isCreating: boolean): ProfileCompleteness {
  const missingCritical: string[] = [];
  const missingOptional: string[] = [];

  // Critical fields
  if (!formData.firstName) missingCritical.push('First Name');
  if (!formData.lastName) missingCritical.push('Last Name');
  if (!formData.email) missingCritical.push('Email');
  if (!formData.phone) missingCritical.push('Phone');
  if (!formData.dateOfBirth && !patient?.dateOfBirth) missingCritical.push('Date of Birth');
  if (!formData.gender && !patient?.gender) missingCritical.push('Gender');
  if (isCreating && !formData.address) missingCritical.push('Address');
  if (isCreating && !formData.maritalStatus) missingCritical.push('Marital Status');
  if (isCreating && !formData.emergencyContactName) missingCritical.push('Emergency Contact Name');
  if (isCreating && !formData.emergencyContactNumber) missingCritical.push('Emergency Contact Phone');
  if (isCreating && !formData.relation) missingCritical.push('Emergency Contact Relationship');
  if (isCreating && (!formData.privacyConsent || !formData.serviceConsent || !formData.medicalConsent)) {
    missingCritical.push('Consents');
  }

  // Optional fields
  if (!formData.occupation && !patient?.occupation) missingOptional.push('Occupation');
  if (!formData.bloodGroup && !patient?.bloodGroup) missingOptional.push('Blood Group');
  if (!formData.allergies && !patient?.allergies) missingOptional.push('Allergies');
  if (!formData.medicalConditions && !patient?.medicalConditions) missingOptional.push('Medical Conditions');

  const totalCritical = 12; // Total critical fields
  const completedCritical = totalCritical - missingCritical.length;
  const score = Math.round((completedCritical / totalCritical) * 100);

  return { score, missingCritical, missingOptional };
}

/**
 * Section Header Component
 * Provides consistent visual hierarchy for form sections
 */
function SectionHeader({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: any; 
  title: string; 
  description: string; 
}) {
  return (
    <div className="flex items-start gap-3 pb-4 border-b border-gray-100">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
        <Icon className="h-5 w-5 text-teal-600" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-semibold text-slate-900 leading-tight">{title}</h3>
        <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

/**
 * Field Group Component
 * Wraps related form fields with consistent spacing
 */
function FieldGroup({ children, columns = 1 }: { children: React.ReactNode; columns?: 1 | 2 }) {
  return (
    <div className={`grid gap-5 ${columns === 2 ? 'md:grid-cols-2' : ''}`}>
      {children}
    </div>
  );
}

/**
 * Form Field Component
 * Standardized form field with consistent styling and spacing
 */
function FormField({ 
  children, 
  fullWidth = false 
}: { 
  children: React.ReactNode; 
  fullWidth?: boolean; 
}) {
  return (
    <div className={fullWidth ? 'md:col-span-2' : ''}>
      {children}
    </div>
  );
}

function PatientProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const [patient, setPatient] = useState<PatientResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<CreatePatientDto>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate profile completeness
  const completeness = useMemo(() => calculateCompleteness(patient, formData, isCreating), [patient, formData, isCreating]);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadPatient();
    }
  }, [isAuthenticated, user]);

  const loadPatient = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await patientApi.getPatient(user.id);

      if (response.success && response.data) {
        // Patient exists - show view/edit mode
        setPatient(response.data);
        setFormData(response.data);
        setIsCreating(false);
        setIsEditing(false);
      } else if (!response.success) {
        // Check if it's a "not found" error (could be different formats)
        const isNotFound = response.error === 'Patient not found' || 
                          response.error?.toLowerCase().includes('not found') ||
                          response.error?.toLowerCase().includes('404');
        
        if (isNotFound) {
          // Patient doesn't exist - show create form
          setPatient(null);
          setIsCreating(true);
          setIsEditing(true);
          setFormData({
            id: user.id,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email || '',
            phone: user.phone || '',
            dateOfBirth: undefined,
            gender: '',
            address: '',
            maritalStatus: '',
            emergencyContactName: '',
            emergencyContactNumber: '',
            relation: '',
            privacyConsent: false,
            serviceConsent: false,
            medicalConsent: false,
          });
        } else if (!response.success) {
          // Other error - show error but still allow create
          console.error('Error loading patient:', response.error);
          // Don't show toast for "not found" - it's expected if profile doesn't exist
          if (response.error && !isNotFound) {
            toast.error(response.error || 'Failed to load profile');
          }
          // Set to create mode if we can't load existing profile
          setPatient(null);
          setIsCreating(true);
          setIsEditing(true);
        }
      }
    } catch (error) {
      console.error('Error loading patient:', error);
      // On error, allow create mode
      setPatient(null);
      setIsCreating(true);
      setIsEditing(true);
      // Don't show error toast - allow user to create profile
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (isCreating) {
      if (!formData.dateOfBirth || !formData.gender || !formData.address || 
          !formData.maritalStatus || !formData.emergencyContactName || 
          !formData.emergencyContactNumber || !formData.relation) {
        toast.error('Please fill in all required profile information');
        return;
      }

      if (!formData.privacyConsent || !formData.serviceConsent || !formData.medicalConsent) {
        toast.error('Please provide consent for all required items');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (isCreating) {
        const dateOfBirth = typeof formData.dateOfBirth === 'string' 
          ? new Date(formData.dateOfBirth) 
          : (formData.dateOfBirth instanceof Date ? formData.dateOfBirth : new Date(formData.dateOfBirth!));

        const createDto: CreatePatientDto = {
          id: user.id,
          firstName: formData.firstName!,
          lastName: formData.lastName!,
          email: formData.email!,
          phone: formData.phone!,
          dateOfBirth,
          gender: formData.gender!,
          address: formData.address!,
          maritalStatus: formData.maritalStatus!,
          emergencyContactName: formData.emergencyContactName!,
          emergencyContactNumber: formData.emergencyContactNumber!,
          relation: formData.relation!,
          privacyConsent: formData.privacyConsent || false,
          serviceConsent: formData.serviceConsent || false,
          medicalConsent: formData.medicalConsent || false,
          occupation: formData.occupation,
          bloodGroup: formData.bloodGroup,
          allergies: formData.allergies,
          medicalConditions: formData.medicalConditions,
          medicalHistory: formData.medicalHistory,
          whatsappPhone: formData.whatsappPhone,
          insuranceProvider: formData.insuranceProvider,
          insuranceNumber: formData.insuranceNumber,
        };

        const response = await patientApi.createPatient(createDto);

        console.log('Profile creation response:', response);

        if (response.success && response.data) {
          setPatient(response.data);
          setIsCreating(false);
          setIsEditing(false);
          toast.success('Profile created successfully');
          
          // Redirect to dashboard after successful profile creation
          // Use replace to avoid back button issues
          try {
            router.replace('/patient/dashboard');
          } catch (error) {
            console.error('Navigation error:', error);
            // Fallback to window.location if router fails
            window.location.href = '/patient/dashboard';
          }
        } else if (!response.success) {
          // If patient already exists error, reload patient data
          const emailExists = response.error?.toLowerCase().includes('email') && 
                             response.error?.toLowerCase().includes('already exists');
          
          if (emailExists) {
            toast.info('Profile already exists. Loading your profile...');
            // Reload patient data - it exists, we just couldn't find it before
            await loadPatient();
          } else if (!response.success) {
            toast.error(response.error || 'Failed to create profile');
          } else {
            toast.error('Failed to create profile');
          }
        }
      } else {
        const response = await patientApi.updatePatient(user.id, formData);

        if (response.success && response.data) {
          setPatient(response.data);
          setIsEditing(false);
          toast.success('Profile updated successfully');
          
          // Check for returnTo parameter
          const returnTo = searchParams?.get('returnTo');
          if (returnTo) {
            router.push(returnTo);
          }
          // Otherwise stay on profile page (user can see updated info)
        } else if (!response.success) {
          toast.error(response.error || 'Failed to update profile');
        } else {
          toast.error('Failed to update profile');
        }
      }
    } catch (error) {
      toast.error(`An error occurred while ${isCreating ? 'creating' : 'updating'} profile`);
      console.error(`Error ${isCreating ? 'creating' : 'updating'} patient:`, error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (patient) {
      // Editing existing profile - check if changes were made
      const hasChanges = JSON.stringify(formData) !== JSON.stringify(patient);
      
      if (hasChanges) {
        // Show confirmation for unsaved changes
        const confirmCancel = window.confirm(
          'You have unsaved changes. Are you sure you want to cancel? All changes will be discarded.'
        );

        if (!confirmCancel) {
          return; // User chose not to cancel
        }
      }

      // Reset to original patient data and exit edit mode
      setFormData(patient);
      setIsEditing(false);
      if (hasChanges) {
        toast.info('Changes discarded');
      }
    } else if (isCreating) {
      // Creating new profile - check if any data was entered
      const hasData = 
        (formData.firstName && formData.firstName.trim().length > 0) ||
        (formData.lastName && formData.lastName.trim().length > 0) ||
        (formData.phone && formData.phone.trim().length > 0) ||
        (formData.dateOfBirth) ||
        (formData.gender) ||
        (formData.address && formData.address.trim().length > 0) ||
        (formData.emergencyContactName && formData.emergencyContactName.trim().length > 0);

      if (hasData) {
        // Show confirmation if user has entered data
        const confirmCancel = window.confirm(
          'You have unsaved changes. Are you sure you want to cancel? Your progress will be lost.'
        );

        if (!confirmCancel) {
          return; // User chose not to cancel
        }
      }

      // Redirect appropriately
      const returnTo = searchParams?.get('returnTo');
      if (returnTo) {
        // User came from another page, send them back
        router.push(returnTo);
      } else {
        // No return path, send to dashboard
        router.push('/patient/dashboard');
      }
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center">
          <p className="text-gray-600">Please log in to view your profile</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      {/* Header - Sticky on mobile */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-4 md:px-6 md:py-6 md:static md:border-b-0 md:bg-transparent">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-1.5 leading-tight">
                {isCreating ? 'Create Your Profile' : 'My Profile'}
              </h1>
              <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                {isCreating 
                  ? 'Complete your profile to get started with consultations'
                  : 'Manage your personal and medical information'}
              </p>
            </div>
            
            {!isEditing && patient && (
              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Profile Completeness Indicator */}
                <div className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="relative w-9 h-9 flex-shrink-0">
                    <svg className="w-9 h-9 transform -rotate-90" viewBox="0 0 36 36">
                      <circle
                        cx="18"
                        cy="18"
                        r="16"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="3"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="16"
                        fill="none"
                        stroke={completeness.score >= 80 ? '#10b981' : completeness.score >= 50 ? '#f59e0b' : '#ef4444'}
                        strokeWidth="3"
                        strokeDasharray={`${completeness.score}, 100`}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-slate-900">
                      {completeness.score}%
                    </span>
                  </div>
                  <div className="hidden sm:block text-xs min-w-0">
                    <p className="font-medium text-slate-900 leading-tight">Complete</p>
                    {completeness.score < 100 && (
                      <p className="text-[10px] text-gray-500 mt-0.5 leading-tight truncate">
                        {completeness.missingCritical.length > 0 
                          ? `${completeness.missingCritical.length} required`
                          : 'All required'}
                      </p>
                    )}
                  </div>
                </div>
                
                <Button 
                  onClick={() => setIsEditing(true)}
                  className="bg-slate-900 hover:bg-slate-800 text-white h-10 px-4 text-sm font-medium"
                >
                  Edit
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 md:px-6 md:py-8 space-y-6 md:space-y-8">
        {/* Profile Completeness Alert */}
        {patient && completeness.score < 100 && completeness.missingCritical.length > 0 && !isEditing && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 md:p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-900 mb-1 leading-tight">
                  Complete your profile to streamline booking
                </p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Your profile is {completeness.score}% complete. Complete it once to avoid re-entering information during consultations.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form Sections */}
        <div className="space-y-6 md:space-y-8">
          {/* Section 1: Basic Identity */}
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-6 pt-6 md:pt-8 px-5 md:px-6">
              <SectionHeader
                icon={User}
                title="Basic Information"
                description="Your core identifying details"
              />
            </CardHeader>
            <CardContent className="px-5 md:px-6 pb-6 md:pb-8">
              <FieldGroup columns={2}>
                <FormField>
                  <Label htmlFor="firstName" className="text-sm font-medium text-slate-900 mb-2 block">
                    First Name <span className="text-red-500 ml-0.5">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <Input
                      id="firstName"
                      value={formData.firstName || ''}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      disabled={!isEditing}
                      className="pl-10 h-11 bg-white border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-base"
                      required
                    />
                  </div>
                </FormField>

                <FormField>
                  <Label htmlFor="lastName" className="text-sm font-medium text-slate-900 mb-2 block">
                    Last Name <span className="text-red-500 ml-0.5">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    value={formData.lastName || ''}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    disabled={!isEditing}
                    className="h-11 bg-white border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-base"
                    required
                  />
                </FormField>

                <FormField>
                  <Label htmlFor="dateOfBirth" className="text-sm font-medium text-slate-900 mb-2 block">
                    Date of Birth {isCreating && <span className="text-red-500 ml-0.5">*</span>}
                  </Label>
                  <DatePicker
                    id="dateOfBirth"
                    value={patient && !isCreating && patient.dateOfBirth
                      ? new Date(patient.dateOfBirth)
                      : formData.dateOfBirth
                        ? (typeof formData.dateOfBirth === 'string' ? new Date(formData.dateOfBirth) : formData.dateOfBirth)
                        : undefined
                    }
                    onChange={(date) => {
                      setFormData({ ...formData, dateOfBirth: date || undefined });
                    }}
                    placeholder="Select date of birth"
                    disabled={!isEditing || !!(patient && !isCreating)}
                    maxDate={new Date()}
                    required={isCreating}
                    className={
                      patient && !isCreating 
                        ? 'bg-gray-50 text-gray-600 border-gray-300' 
                        : 'bg-white border-gray-300'
                    }
                  />
                  {patient && !isCreating && (
                    <p className="text-xs text-gray-500 mt-1.5">Date of birth cannot be changed</p>
                  )}
                </FormField>

                <FormField>
                  <Label htmlFor="gender" className="text-sm font-medium text-slate-900 mb-2 block">
                    Gender {isCreating && <span className="text-red-500 ml-0.5">*</span>}
                  </Label>
                  <Select 
                    value={patient && !isCreating ? patient.gender : (formData.gender || '')} 
                    onValueChange={(value) => setFormData({ ...formData, gender: value })}
                    disabled={!isEditing || !!(patient && !isCreating)}
                    required={isCreating}
                  >
                    <SelectTrigger 
                      id="gender"
                      className={`h-11 border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-base ${
                        patient && !isCreating ? 'bg-gray-50 text-gray-600' : 'bg-white'
                      }`}
                    >
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(Gender).map((g) => (
                        <SelectItem key={g} value={g}>
                          {g.charAt(0).toUpperCase() + g.slice(1).toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {patient && !isCreating && (
                    <p className="text-xs text-gray-500 mt-1.5">Gender cannot be changed</p>
                  )}
                </FormField>

                {isCreating && (
                  <FormField>
                    <Label htmlFor="maritalStatus" className="text-sm font-medium text-slate-900 mb-2 block">
                      Marital Status <span className="text-red-500 ml-0.5">*</span>
                    </Label>
                    <Select 
                      value={formData.maritalStatus || ''} 
                      onValueChange={(value) => setFormData({ ...formData, maritalStatus: value })}
                      disabled={!isEditing}
                      required
                    >
                      <SelectTrigger id="maritalStatus" className="h-11 bg-white border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-base">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Single">Single</SelectItem>
                        <SelectItem value="Married">Married</SelectItem>
                        <SelectItem value="Divorced">Divorced</SelectItem>
                        <SelectItem value="Widowed">Widowed</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                )}
              </FieldGroup>
            </CardContent>
          </Card>

          {/* Section 2: Contact Information */}
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-6 pt-6 md:pt-8 px-5 md:px-6">
              <SectionHeader
                icon={Phone}
                title="Contact Information"
                description="How we can reach you"
              />
            </CardHeader>
            <CardContent className="px-5 md:px-6 pb-6 md:pb-8">
              <FieldGroup columns={2}>
                <FormField>
                  <Label htmlFor="email" className="text-sm font-medium text-slate-900 mb-2 block">
                    Email <span className="text-red-500 ml-0.5">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      disabled={true}
                      className="pl-10 h-11 bg-gray-50 border-gray-200 text-gray-600 text-base"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">Email is managed by your account</p>
                </FormField>

                <FormField>
                  <Label htmlFor="phone" className="text-sm font-medium text-slate-900 mb-2 block">
                    Phone <span className="text-red-500 ml-0.5">*</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      disabled={!isEditing}
                      className="pl-10 h-11 bg-white border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-base"
                      required
                    />
                  </div>
                </FormField>

                <FormField fullWidth>
                  <Label htmlFor="address" className="text-sm font-medium text-slate-900 mb-2 block">
                    Address {isCreating && <span className="text-red-500 ml-0.5">*</span>}
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <Input
                      id="address"
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      disabled={!isEditing}
                      className="pl-10 h-11 bg-white border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-base"
                      required={isCreating}
                    />
                  </div>
                </FormField>
              </FieldGroup>
            </CardContent>
          </Card>

          {/* Section 3: Emergency Contact (Only for creation) */}
          {isCreating && (
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-6 pt-6 md:pt-8 px-5 md:px-6">
                <SectionHeader
                  icon={AlertCircle}
                  title="Emergency Contact"
                  description="Contact information for emergencies"
                />
              </CardHeader>
              <CardContent className="px-5 md:px-6 pb-6 md:pb-8">
                <FieldGroup columns={2}>
                  <FormField fullWidth>
                    <Label htmlFor="emergencyContactName" className="text-sm font-medium text-slate-900 mb-2 block">
                      Emergency Contact Name <span className="text-red-500 ml-0.5">*</span>
                    </Label>
                    <Input
                      id="emergencyContactName"
                      value={formData.emergencyContactName || ''}
                      onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                      disabled={!isEditing}
                      className="h-11 bg-white border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-base"
                      required
                    />
                  </FormField>

                  <FormField>
                    <Label htmlFor="emergencyContactNumber" className="text-sm font-medium text-slate-900 mb-2 block">
                      Emergency Contact Phone <span className="text-red-500 ml-0.5">*</span>
                    </Label>
                    <Input
                      id="emergencyContactNumber"
                      type="tel"
                      value={formData.emergencyContactNumber || ''}
                      onChange={(e) => setFormData({ ...formData, emergencyContactNumber: e.target.value })}
                      disabled={!isEditing}
                      className="h-11 bg-white border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-base"
                      required
                    />
                  </FormField>

                  <FormField>
                    <Label htmlFor="relation" className="text-sm font-medium text-slate-900 mb-2 block">
                      Relationship <span className="text-red-500 ml-0.5">*</span>
                    </Label>
                    <Select 
                      value={formData.relation || ''} 
                      onValueChange={(value) => setFormData({ ...formData, relation: value })}
                      disabled={!isEditing}
                      required
                    >
                      <SelectTrigger id="relation" className="h-11 bg-white border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-base">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Spouse">Spouse</SelectItem>
                        <SelectItem value="Parent">Parent</SelectItem>
                        <SelectItem value="Sibling">Sibling</SelectItem>
                        <SelectItem value="Child">Child</SelectItem>
                        <SelectItem value="Friend">Friend</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                </FieldGroup>
              </CardContent>
            </Card>
          )}

          {/* Section 4: Medical Information (Optional) */}
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-6 pt-6 md:pt-8 px-5 md:px-6">
              <SectionHeader
                icon={Heart}
                title="Medical Information"
                description="Optional details to help us provide better care"
              />
            </CardHeader>
            <CardContent className="px-5 md:px-6 pb-6 md:pb-8">
              <FieldGroup columns={2}>
                <FormField>
                  <Label htmlFor="bloodGroup" className="text-sm font-medium text-slate-900 mb-2 block">
                    Blood Group
                  </Label>
                  <Select 
                    value={formData.bloodGroup || ''} 
                    onValueChange={(value) => setFormData({ ...formData, bloodGroup: value || undefined })}
                    disabled={!isEditing}
                  >
                    <SelectTrigger id="bloodGroup" className="h-11 bg-white border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-base">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A+">A+</SelectItem>
                      <SelectItem value="A-">A-</SelectItem>
                      <SelectItem value="B+">B+</SelectItem>
                      <SelectItem value="B-">B-</SelectItem>
                      <SelectItem value="AB+">AB+</SelectItem>
                      <SelectItem value="AB-">AB-</SelectItem>
                      <SelectItem value="O+">O+</SelectItem>
                      <SelectItem value="O-">O-</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField>
                  <Label htmlFor="occupation" className="text-sm font-medium text-slate-900 mb-2 block">
                    Occupation
                  </Label>
                  <Input
                    id="occupation"
                    value={formData.occupation || ''}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value || undefined })}
                    disabled={!isEditing}
                    className="h-11 bg-white border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-base"
                  />
                </FormField>

                <FormField fullWidth>
                  <Label htmlFor="allergies" className="text-sm font-medium text-slate-900 mb-2 block">
                    Allergies
                  </Label>
                  <Textarea
                    id="allergies"
                    value={formData.allergies || ''}
                    onChange={(e) => setFormData({ ...formData, allergies: e.target.value || undefined })}
                    disabled={!isEditing}
                    rows={3}
                    placeholder="List any known allergies"
                    className="bg-white border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-base resize-none"
                  />
                </FormField>

                <FormField fullWidth>
                  <Label htmlFor="medicalConditions" className="text-sm font-medium text-slate-900 mb-2 block">
                    Medical Conditions
                  </Label>
                  <Textarea
                    id="medicalConditions"
                    value={formData.medicalConditions || ''}
                    onChange={(e) => setFormData({ ...formData, medicalConditions: e.target.value || undefined })}
                    disabled={!isEditing}
                    rows={3}
                    placeholder="List any existing medical conditions"
                    className="bg-white border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-base resize-none"
                  />
                </FormField>
              </FieldGroup>
            </CardContent>
          </Card>

          {/* Section 5: Consent (Only for creation) */}
          {isCreating && (
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-6 pt-6 md:pt-8 px-5 md:px-6">
                <SectionHeader
                  icon={Shield}
                  title="Consent & Authorization"
                  description="Please review and provide consent for the following"
                />
              </CardHeader>
              <CardContent className="px-5 md:px-6 pb-6 md:pb-8">
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
                    <Checkbox
                      id="privacyConsent"
                      checked={formData.privacyConsent || false}
                      onCheckedChange={(checked) => setFormData({ ...formData, privacyConsent: !!checked })}
                      disabled={!isEditing}
                      className="mt-0.5 h-5 w-5"
                    />
                    <Label htmlFor="privacyConsent" className="text-sm cursor-pointer leading-relaxed flex-1">
                      <span className="font-medium text-slate-900 block mb-1">
                        Privacy Consent <span className="text-red-500">*</span>
                      </span>
                      <p className="text-gray-600 leading-relaxed text-sm">
                        I consent to the collection and use of my personal information as outlined in the Privacy Policy.
                      </p>
                    </Label>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
                    <Checkbox
                      id="serviceConsent"
                      checked={formData.serviceConsent || false}
                      onCheckedChange={(checked) => setFormData({ ...formData, serviceConsent: !!checked })}
                      disabled={!isEditing}
                      className="mt-0.5 h-5 w-5"
                    />
                    <Label htmlFor="serviceConsent" className="text-sm cursor-pointer leading-relaxed flex-1">
                      <span className="font-medium text-slate-900 block mb-1">
                        Service Consent <span className="text-red-500">*</span>
                      </span>
                      <p className="text-gray-600 leading-relaxed text-sm">
                        I consent to receiving healthcare services and treatment.
                      </p>
                    </Label>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
                    <Checkbox
                      id="medicalConsent"
                      checked={formData.medicalConsent || false}
                      onCheckedChange={(checked) => setFormData({ ...formData, medicalConsent: !!checked })}
                      disabled={!isEditing}
                      className="mt-0.5 h-5 w-5"
                    />
                    <Label htmlFor="medicalConsent" className="text-sm cursor-pointer leading-relaxed flex-1">
                      <span className="font-medium text-slate-900 block mb-1">
                        Medical Consent <span className="text-red-500">*</span>
                      </span>
                      <p className="text-gray-600 leading-relaxed text-sm">
                        I consent to medical procedures and treatments as recommended by my healthcare provider.
                      </p>
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Action Buttons - Sticky on mobile */}
      {isEditing && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg md:static md:border-t-0 md:shadow-none md:bg-transparent md:z-auto">
          <div className="max-w-4xl mx-auto px-4 py-4 md:px-6 md:py-6">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button 
                variant="outline" 
                onClick={handleCancel} 
                disabled={isSubmitting}
                className="h-12 sm:h-11 border-gray-300 text-gray-700 hover:bg-gray-50 text-base font-medium"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isSubmitting}
                className="h-12 sm:h-11 bg-teal-600 hover:bg-teal-700 text-white text-base font-medium shadow-sm"
              >
                {isSubmitting 
                  ? (isCreating ? 'Creating...' : 'Saving...') 
                  : (isCreating ? 'Create Profile' : 'Save Changes')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PatientProfilePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    }>
      <PatientProfilePageContent />
    </Suspense>
  );
}
