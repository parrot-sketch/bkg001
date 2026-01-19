'use client';

/**
 * Patient Profile Page
 * 
 * Medical-grade patient profile management with:
 * - Structured, sectioned form layout
 * - Profile completeness tracking
 * - Neutral, calming design system
 * - Single source of truth for patient data
 */

import { useEffect, useState, useMemo } from 'react';
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
import { User, Mail, Phone, MapPin, Calendar, AlertCircle, CheckCircle2, Info } from 'lucide-react';
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

export default function PatientProfilePage() {
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

        if (response.success && response.data) {
          setPatient(response.data);
          setIsCreating(false);
          setIsEditing(false);
          toast.success('Profile created successfully');
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
      setFormData(patient);
      setIsEditing(false);
    } else if (isCreating) {
      loadPatient();
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-600">Please log in to view your profile</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Profile Completeness */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mb-1">
            {isCreating ? 'Create Your Profile' : 'Profile'}
          </h1>
          <p className="text-sm text-gray-600">
            {isCreating 
              ? 'Complete your profile to get started'
              : 'Manage your personal information'}
          </p>
        </div>
        
        {!isEditing && patient && (
          <div className="flex items-center gap-3">
            {/* Profile Completeness Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="relative w-10 h-10">
                <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
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
                <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-slate-900">
                  {completeness.score}%
                </span>
              </div>
              <div className="text-sm">
                <p className="font-medium text-slate-900">Profile Complete</p>
                {completeness.score < 100 && (
                  <p className="text-xs text-gray-500">
                    {completeness.missingCritical.length > 0 
                      ? `${completeness.missingCritical.length} required field${completeness.missingCritical.length > 1 ? 's' : ''} missing`
                      : 'All required fields complete'}
                  </p>
                )}
              </div>
            </div>
            
            <Button 
              onClick={() => setIsEditing(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white"
            >
              Edit Profile
            </Button>
          </div>
        )}
      </div>

      {/* Profile Completeness Alert */}
      {patient && completeness.score < 100 && completeness.missingCritical.length > 0 && !isEditing && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900 mb-1">
                Complete your profile to book faster
              </p>
              <p className="text-xs text-amber-700">
                Your profile is {completeness.score}% complete. Complete it once to avoid re-entering information during booking.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Form Sections */}
      <div className="space-y-6">
        {/* Section 1: Basic Identity */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-slate-900">Basic Identity</CardTitle>
            <CardDescription className="text-sm text-gray-600">
              Your core identifying information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-medium text-slate-900">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="firstName"
                    value={formData.firstName || ''}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    disabled={!isEditing}
                    className="pl-10 bg-white border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-medium text-slate-900">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  value={formData.lastName || ''}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  disabled={!isEditing}
                  className="bg-white border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfBirth" className="text-sm font-medium text-slate-900">
                  Date of Birth {isCreating && <span className="text-red-500">*</span>}
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={patient && !isCreating 
                      ? (patient.dateOfBirth ? format(new Date(patient.dateOfBirth), 'yyyy-MM-dd') : '')
                      : (formData.dateOfBirth ? (typeof formData.dateOfBirth === 'string' ? formData.dateOfBirth : format(new Date(formData.dateOfBirth), 'yyyy-MM-dd')) : '')
                    }
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    disabled={!isEditing || !!(patient && !isCreating)}
                    className={`pl-10 border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 ${
                      patient && !isCreating ? 'bg-gray-50 text-gray-600' : 'bg-white'
                    }`}
                    required={isCreating}
                    max={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
                {patient && !isCreating && (
                  <p className="text-xs text-gray-500">Date of birth cannot be changed</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender" className="text-sm font-medium text-slate-900">
                  Gender {isCreating && <span className="text-red-500">*</span>}
                </Label>
                <Select 
                  value={patient && !isCreating ? patient.gender : (formData.gender || '')} 
                  onValueChange={(value) => setFormData({ ...formData, gender: value })}
                  disabled={!isEditing || !!(patient && !isCreating)}
                  required={isCreating}
                >
                  <SelectTrigger 
                    id="gender"
                    className={`border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 ${
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
                  <p className="text-xs text-gray-500">Gender cannot be changed</p>
                )}
              </div>

              {isCreating && (
                <div className="space-y-2">
                  <Label htmlFor="maritalStatus" className="text-sm font-medium text-slate-900">
                    Marital Status <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={formData.maritalStatus || ''} 
                    onValueChange={(value) => setFormData({ ...formData, maritalStatus: value })}
                    disabled={!isEditing}
                    required
                  >
                    <SelectTrigger id="maritalStatus" className="bg-white border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500">
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
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Contact Information */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-slate-900">Contact Information</CardTitle>
            <CardDescription className="text-sm text-gray-600">
              How we can reach you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-900">
                  Email <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={true}
                    className="pl-10 bg-gray-50 border-gray-200 text-gray-600"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500">Email is managed by your account</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-slate-900">
                  Phone <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={!isEditing}
                    className="pl-10 bg-white border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address" className="text-sm font-medium text-slate-900">
                  Address {isCreating && <span className="text-red-500">*</span>}
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="address"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    disabled={!isEditing}
                    className="pl-10 bg-white border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    required={isCreating}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Emergency Contact (Only for creation) */}
        {isCreating && (
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-slate-900">Emergency Contact</CardTitle>
              <CardDescription className="text-sm text-gray-600">
                Contact information for emergencies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="emergencyContactName" className="text-sm font-medium text-slate-900">
                    Emergency Contact Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="emergencyContactName"
                    value={formData.emergencyContactName || ''}
                    onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                    disabled={!isEditing}
                    className="bg-white border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyContactNumber" className="text-sm font-medium text-slate-900">
                    Emergency Contact Phone <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="emergencyContactNumber"
                    type="tel"
                    value={formData.emergencyContactNumber || ''}
                    onChange={(e) => setFormData({ ...formData, emergencyContactNumber: e.target.value })}
                    disabled={!isEditing}
                    className="bg-white border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="relation" className="text-sm font-medium text-slate-900">
                    Relationship <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={formData.relation || ''} 
                    onValueChange={(value) => setFormData({ ...formData, relation: value })}
                    disabled={!isEditing}
                    required
                  >
                    <SelectTrigger id="relation" className="bg-white border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500">
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
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 4: Medical Metadata (Optional) */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-slate-900">Medical Information</CardTitle>
            <CardDescription className="text-sm text-gray-600">
              Optional medical details to help us provide better care
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bloodGroup" className="text-sm font-medium text-slate-900">
                  Blood Group
                </Label>
                <Select 
                  value={formData.bloodGroup || ''} 
                  onValueChange={(value) => setFormData({ ...formData, bloodGroup: value || undefined })}
                  disabled={!isEditing}
                >
                  <SelectTrigger id="bloodGroup" className="bg-white border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500">
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="occupation" className="text-sm font-medium text-slate-900">
                  Occupation
                </Label>
                <Input
                  id="occupation"
                  value={formData.occupation || ''}
                  onChange={(e) => setFormData({ ...formData, occupation: e.target.value || undefined })}
                  disabled={!isEditing}
                  className="bg-white border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="allergies" className="text-sm font-medium text-slate-900">
                  Allergies
                </Label>
                <Textarea
                  id="allergies"
                  value={formData.allergies || ''}
                  onChange={(e) => setFormData({ ...formData, allergies: e.target.value || undefined })}
                  disabled={!isEditing}
                  rows={2}
                  placeholder="List any known allergies"
                  className="bg-white border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="medicalConditions" className="text-sm font-medium text-slate-900">
                  Medical Conditions
                </Label>
                <Textarea
                  id="medicalConditions"
                  value={formData.medicalConditions || ''}
                  onChange={(e) => setFormData({ ...formData, medicalConditions: e.target.value || undefined })}
                  disabled={!isEditing}
                  rows={2}
                  placeholder="List any existing medical conditions"
                  className="bg-white border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Consent (Only for creation) */}
        {isCreating && (
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-slate-900">Consent & Authorization</CardTitle>
              <CardDescription className="text-sm text-gray-600">
                Please review and provide consent for the following
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Checkbox
                    id="privacyConsent"
                    checked={formData.privacyConsent || false}
                    onCheckedChange={(checked) => setFormData({ ...formData, privacyConsent: !!checked })}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                  <Label htmlFor="privacyConsent" className="text-sm cursor-pointer leading-relaxed flex-1">
                    <span className="font-medium text-slate-900">Privacy Consent <span className="text-red-500">*</span></span>
                    <p className="text-gray-600 mt-1">I consent to the collection and use of my personal information as outlined in the Privacy Policy.</p>
                  </Label>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Checkbox
                    id="serviceConsent"
                    checked={formData.serviceConsent || false}
                    onCheckedChange={(checked) => setFormData({ ...formData, serviceConsent: !!checked })}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                  <Label htmlFor="serviceConsent" className="text-sm cursor-pointer leading-relaxed flex-1">
                    <span className="font-medium text-slate-900">Service Consent <span className="text-red-500">*</span></span>
                    <p className="text-gray-600 mt-1">I consent to receiving healthcare services and treatment.</p>
                  </Label>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Checkbox
                    id="medicalConsent"
                    checked={formData.medicalConsent || false}
                    onCheckedChange={(checked) => setFormData({ ...formData, medicalConsent: !!checked })}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                  <Label htmlFor="medicalConsent" className="text-sm cursor-pointer leading-relaxed flex-1">
                    <span className="font-medium text-slate-900">Medical Consent <span className="text-red-500">*</span></span>
                    <p className="text-gray-600 mt-1">I consent to medical procedures and treatments as recommended by my healthcare provider.</p>
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Action Buttons */}
      {isEditing && (
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button 
            variant="outline" 
            onClick={handleCancel} 
            disabled={isSubmitting}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSubmitting}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {isSubmitting 
              ? (isCreating ? 'Creating...' : 'Saving...') 
              : (isCreating ? 'Create Profile' : 'Save Changes')}
          </Button>
        </div>
      )}
    </div>
  );
}
