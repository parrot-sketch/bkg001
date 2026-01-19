'use client';

/**
 * Consultation Booking Journey
 * 
 * A healthcare-grade patient journey, not a form wizard.
 * Calm, progressive, trust-building experience for aesthetic surgery consultations.
 * 
 * This is where User → Patient transition begins.
 */

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { patientApi } from '@/lib/api/patient';
import type { SubmitConsultationRequestDto } from '@/application/dtos/SubmitConsultationRequestDto';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Gender } from '@/domain/enums/Gender';
import { Calendar, ChevronLeft, ChevronRight, CheckCircle2, Sparkles, Users, Clock, Shield, FileText, Info } from 'lucide-react';
import { format, addDays } from 'date-fns';

const TOTAL_STEPS = 7;

interface Service {
  id: number;
  service_name: string;
  description?: string;
  price: number;
  category?: string;
}

/**
 * Generate website URL from service name
 * Pattern: "Facelift" → "https://www.nairobisculpt.com/facelift.html"
 */
function getServiceWebsiteUrl(serviceName: string): string | null {
  // Special cases for non-standard URLs
  const urlMap: Record<string, string> = {
    'Brazilian Butt Lift': 'https://www.nairobisculpt.com/bbl.html',
    'Breast Augmentation': 'https://www.nairobisculpt.com/breast-augmentation.html',
    'Scar Management': 'https://www.nairobisculpt.com/scar-management.html',
    'Non-Surgical Treatments': 'https://www.nairobisculpt.com/non-surgical.html',
    'Initial Consultation': '', // No dedicated page
    'Follow-up Consultation': '', // No dedicated page
  };

  if (urlMap[serviceName]) {
    return urlMap[serviceName] || null;
  }

  // Generate URL from service name: "Facelift" → "/facelift.html"
  const slug = serviceName.toLowerCase().replace(/\s+/g, '-');
  return `https://www.nairobisculpt.com/${slug}.html`;
}

/**
 * Category groups matching website structure
 */
const CATEGORY_LABELS: Record<string, string> = {
  all: 'All Services',
  Procedure: 'Procedures',
  Treatment: 'Treatments',
  Consultation: 'Consultations',
};

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  profile_image?: string;
}

function BookConsultationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [loadingPatientProfile, setLoadingPatientProfile] = useState(false);
  
  // Get context from URL query
  const preselectedDoctorId = searchParams?.get('doctorId');
  const returnTo = searchParams?.get('returnTo') || null; // e.g., '/patient/dashboard' or '/patient/appointments'

  // Form data - all steps
  const [formData, setFormData] = useState({
    // Step 1: Identity
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',

    // Step 2: Reason for Visit
    serviceId: '',
    concernDescription: '',

    // Step 3: Preferred Doctor (optional)
    doctorId: '',

    // Step 4: Appointment Request
    preferredDate: '',
    timePreference: '', // Morning, Afternoon, Evening
    notes: '',

    // Step 5: Basic Medical Safety
    isOver18: false,
    hasSeriousConditions: '',
    isPregnant: '',

    // Step 6: Consent
    contactConsent: false,
    privacyConsent: false,
    acknowledgmentConsent: false,
  });

  // Data
  const [services, setServices] = useState<Service[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  
  // Category filter for Step 2
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Load data - Non-blocking: Don't prevent user from seeing Step 1
  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      router.replace('/patient/login');
      return;
    }

    // Pre-fill user data immediately
    setFormData((prev) => ({
      ...prev,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || '',
    }));

    // Check if user has patient profile and pre-fill additional data
    const loadPatientProfile = async () => {
      try {
        setLoadingPatientProfile(true);
        
        // Try to fetch patient profile - if successful, profile exists
        const response = await patientApi.getPatient(user.id);
        const profileExists = response.success && response.data !== null;
        setHasProfile(profileExists);

        if (profileExists && response.data) {
          // Pre-fill date of birth and gender from existing profile
          const patient = response.data;
          setFormData((prev) => ({
            ...prev,
            dateOfBirth: patient.dateOfBirth ? format(new Date(patient.dateOfBirth), 'yyyy-MM-dd') : '',
            gender: patient.gender || '',
          }));
        }
      } catch (error) {
        console.error('Error loading patient profile:', error);
        // Silent fail - user can still fill manually
        setHasProfile(false);
      } finally {
        setLoadingPatientProfile(false);
      }
    };

    loadPatientProfile();

    // Fetch services and doctors in parallel - non-blocking
    // User can proceed to Step 1 while data loads in background
    const fetchServices = async () => {
      try {
        setLoadingServices(true);
        const response = await fetch('/api/services');
        const result = await response.json();
        if (result.success && result.data) {
          setServices(result.data);
        }
      } catch (error) {
        console.error('Error fetching services:', error);
        // Silent fail - services will show empty state if needed
      } finally {
        setLoadingServices(false);
      }
    };

    const fetchDoctors = async () => {
      try {
        setLoadingDoctors(true);
        const response = await fetch('/api/doctors');
        const result = await response.json();
        if (result.success && result.data) {
          setDoctors(result.data);
        }
      } catch (error) {
        console.error('Error fetching doctors:', error);
        // Silent fail - doctors will show empty state if needed
      } finally {
        setLoadingDoctors(false);
      }
    };

    // Fetch in parallel - non-blocking
    fetchServices();
    fetchDoctors();
  }, [user, isAuthenticated, isLoading, router]);

  // Check if profile is complete (has all required fields for booking)
  const isProfileComplete = useMemo(() => {
    if (!hasProfile) return false;
    return !!(
      formData.firstName &&
      formData.lastName &&
      formData.email &&
      formData.phone &&
      formData.dateOfBirth &&
      formData.gender
    );
  }, [hasProfile, formData.firstName, formData.lastName, formData.email, formData.phone, formData.dateOfBirth, formData.gender]);

  // Skip Step 1 if profile is complete - start at Step 2
  useEffect(() => {
    if (isProfileComplete && currentStep === 1 && !loadingPatientProfile) {
      setCurrentStep(2);
    }
  }, [isProfileComplete, loadingPatientProfile]);

  // Pre-select doctor if doctorId is in URL (from "Meet Our Doctors" page)
  useEffect(() => {
    if (preselectedDoctorId && doctors.length > 0 && !formData.doctorId) {
      const doctor = doctors.find((d) => d.id === preselectedDoctorId);
      if (doctor) {
        handleInputChange('doctorId', preselectedDoctorId);
      }
    }
  }, [preselectedDoctorId, doctors, formData.doctorId]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  /**
   * Check if Step 1 (identity) should be skipped
   * Skip if profile is complete (has all required fields)
   */
  const shouldSkipIdentityStep = (): boolean => {
    return isProfileComplete;
  };

  /**
   * Check if Step 3 (doctor selection) should be skipped
   * Skip if doctorId is already selected (from URL or previous selection)
   */
  const shouldSkipDoctorStep = (): boolean => {
    return !!formData.doctorId;
  };

  const nextStep = () => {
    if (currentStep < TOTAL_STEPS && canProceed()) {
      let nextStepNumber = currentStep + 1;
      
      // Skip Step 1 (identity) if profile is complete
      if (nextStepNumber === 1 && shouldSkipIdentityStep()) {
        nextStepNumber = 2;
      }
      
      // Skip Step 3 (doctor selection) if doctor is already selected
      if (nextStepNumber === 3 && shouldSkipDoctorStep()) {
        nextStepNumber = 4; // Jump directly to Step 4 (appointment request)
      }
      
      setCurrentStep(nextStepNumber);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      let prevStepNumber = currentStep - 1;
      
      // Skip Step 1 (identity) when going back if profile is complete
      if (prevStepNumber === 1 && shouldSkipIdentityStep()) {
        prevStepNumber = 2; // Can't go to Step 1, go to Step 2 instead
      }
      
      // Skip Step 3 (doctor selection) when going back if doctor is already selected
      if (prevStepNumber === 3 && shouldSkipDoctorStep()) {
        prevStepNumber = 2; // Go back directly to Step 2 (service selection)
      }
      
      setCurrentStep(prevStepNumber);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!(formData.firstName && formData.lastName && formData.email && formData.phone && formData.dateOfBirth && formData.gender);
      case 2:
        return !!(formData.serviceId && formData.concernDescription);
      case 3:
        return !!(formData.doctorId && formData.doctorId.trim().length > 0); // Required
      case 4:
        return !!(formData.preferredDate && formData.timePreference);
      case 5:
        return formData.isOver18 && formData.hasSeriousConditions !== '' && formData.isPregnant !== '';
      case 6:
        return formData.contactConsent && formData.privacyConsent && formData.acknowledgmentConsent;
      case 7:
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please log in to submit a consultation request');
      return;
    }

    setIsSubmitting(true);
    try {
      // Map form data to SubmitConsultationRequestDto
      const consultationRequestDto: SubmitConsultationRequestDto = {
        patientId: user.id,
        serviceId: formData.serviceId || undefined,
        doctorId: formData.doctorId || undefined,
        preferredDate: formData.preferredDate ? new Date(formData.preferredDate) : undefined,
        timePreference: formData.timePreference || undefined,
        concernDescription: formData.concernDescription || '',
        notes: formData.notes || undefined,
        medicalInfo: {
          isOver18: formData.isOver18 || false,
          hasSeriousConditions: formData.hasSeriousConditions || '',
          isPregnant: formData.isPregnant || '',
        },
        // Consent fields at top level (for API validation)
        isOver18: formData.isOver18 || false,
        contactConsent: formData.contactConsent || false,
        privacyConsent: formData.privacyConsent || false,
        acknowledgmentConsent: formData.acknowledgmentConsent || false,
      };

      const response = await patientApi.submitConsultationRequest(consultationRequestDto);

      if (response.success && response.data) {
        toast.success('Your consultation request has been received. Our care team will contact you shortly.');
        
        // Preserve context - return to the page user came from, or default to dashboard
        const redirectTo = returnTo || '/patient/dashboard';
        router.push(redirectTo);
      } else if (!response.success) {
        toast.error(response.error || 'Unable to submit your request. Please try again.');
      } else {
        toast.error('Unable to submit your request. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting consultation:', error);
      toast.error('Unable to submit your request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Only block on auth loading - services/doctors load in background
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  // Calculate progress percentage, accounting for skipped steps
  const getEffectiveStep = (): number => {
    let effectiveStep = currentStep;
    
    // Adjust for skipped Step 1 (identity)
    if (shouldSkipIdentityStep() && currentStep > 1) {
      effectiveStep = currentStep - 1;
    }
    
    // Adjust for skipped Step 3 (doctor selection)
    if (shouldSkipDoctorStep() && effectiveStep > 3) {
      effectiveStep = effectiveStep - 1;
    }
    
    return effectiveStep;
  };

  const effectiveSteps = (() => {
    let steps = TOTAL_STEPS;
    if (shouldSkipIdentityStep()) steps -= 1;
    if (shouldSkipDoctorStep()) steps -= 1;
    return steps;
  })();
  
  const progressPercentage = (getEffectiveStep() / effectiveSteps) * 100;
  const minDate = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header - Calm, Professional */}
        <div className="mb-8 space-y-2">
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">Submit an Inquiry</h1>
          <p className="text-sm text-gray-600 leading-relaxed">Share your preferences and we'll guide you through the next steps</p>
        </div>

        {/* Progress - Subtle and calm */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-600">
              Step {getEffectiveStep()} of {effectiveSteps}
            </span>
            <span className="text-xs text-gray-400">
              {Math.round(progressPercentage)}% complete
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Profile Information Banner - Show when profile is being used */}
        {isProfileComplete && (
          <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-xl">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900 mb-1">
                  Using information from your profile
                </p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Your profile information (name, date of birth, gender) is being used. You can update it in your{' '}
                  <a href="/patient/profile" className="underline font-medium text-primary hover:text-primary/80 transition-colors">
                    Profile
                  </a>{' '}
                  page.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 mb-6 shadow-sm">
          {/* Step 1: Identity */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  {hasProfile ? 'Confirm your information' : "Let's get started"}
                </h2>
                <p className="text-sm text-gray-600">
                  {hasProfile 
                    ? 'We have your information on file. Please confirm it\'s up to date.'
                    : 'We\'ll need a few basic details to begin'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-medium text-slate-900">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    disabled={hasProfile === true}
                    className={hasProfile ? 'bg-gray-50 text-gray-600' : ''}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-medium text-slate-900">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    disabled={hasProfile === true}
                    className={hasProfile ? 'bg-gray-50 text-gray-600' : ''}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-900">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-gray-50 text-gray-600"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-slate-900">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth" className="text-sm font-medium text-slate-900">Date of Birth *</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    disabled={hasProfile === true}
                    className={hasProfile ? 'bg-gray-50 text-gray-600' : ''}
                    required
                    max={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender" className="text-sm font-medium text-slate-900">Gender *</Label>
                  <Select 
                    value={formData.gender} 
                    onValueChange={(value) => handleInputChange('gender', value)}
                    disabled={hasProfile === true}
                  >
                    <SelectTrigger 
                      id="gender" 
                      className={hasProfile ? 'bg-gray-50 text-gray-600' : ''}
                      disabled={hasProfile === true}
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
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Reason for Visit - Service Intent */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">What brings you in?</h2>
                <p className="text-sm text-gray-600">Select a service below or browse all options</p>
              </div>

              {/* Category Filter - Matches website structure */}
              {services.length > 0 && (
                <div className="flex flex-wrap gap-2 pb-2">
                  {['all', 'Procedure', 'Treatment', 'Consultation'].map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setSelectedCategory(category)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all ${
                        selectedCategory === category
                          ? 'border-teal-500 bg-teal-50 text-teal-700'
                          : 'border-gray-200 bg-white text-slate-700 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {CATEGORY_LABELS[category] || category}
                    </button>
                  ))}
                </div>
              )}

              {/* Service Cards - Mobile-friendly, grouped by category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {loadingServices ? (
                  <div className="col-span-2 flex items-center justify-center py-8">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <div className="h-4 w-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                      <span>Loading services...</span>
                    </div>
                  </div>
                ) : services.length > 0 ? (
                  services
                    .filter((s) => selectedCategory === 'all' || s.category === selectedCategory)
                    .map((service) => {
                      const websiteUrl = getServiceWebsiteUrl(service.service_name);
                      const isSelected = formData.serviceId === service.id.toString();
                      
                      return (
                        <div
                          key={service.id}
                          className={`p-4 rounded-lg border-2 text-left transition-all min-h-[100px] ${
                            isSelected
                              ? 'border-teal-500 bg-teal-50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleInputChange('serviceId', service.id.toString())}
                            className="w-full text-left"
                          >
                            <div className="font-medium text-slate-900 mb-1 flex items-start justify-between gap-2">
                              <span>{service.service_name}</span>
                              {isSelected && (
                                <CheckCircle2 className="h-4 w-4 text-teal-600 flex-shrink-0 mt-0.5" />
                              )}
                            </div>
                            {service.description && (
                              <div className="text-xs text-gray-600 mt-1 line-clamp-2">{service.description}</div>
                            )}
                          </button>
                          
                          {/* Learn More Link - Opens website in new tab */}
                          {websiteUrl && (
                            <a
                              href={websiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="mt-2 inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 hover:underline font-medium"
                            >
                              Learn more
                              <svg
                                className="h-3 w-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                />
                              </svg>
                            </a>
                          )}
                        </div>
                      );
                    })
                ) : (
                  <div className="col-span-2 text-center py-8">
                    <p className="text-sm text-gray-500 mb-2">No services available at the moment.</p>
                    <p className="text-xs text-gray-400">Please contact us directly to book your consultation.</p>
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-2">
                <Label htmlFor="concernDescription" className="text-sm font-medium text-slate-900">
                  What are you hoping to improve or discuss? *
                </Label>
                <Textarea
                  id="concernDescription"
                  value={formData.concernDescription}
                  onChange={(e) => handleInputChange('concernDescription', e.target.value)}
                  placeholder="Share any concerns, goals, or questions you'd like to discuss..."
                  rows={5}
                  required
                />
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">This helps our surgeons prepare for your consultation</p>
              </div>
            </div>
          )}

          {/* Step 3: Preferred Doctor (Optional) */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Select a surgeon</h2>
                <p className="text-sm text-gray-600">Please select a surgeon for your consultation. Our team will confirm availability and may suggest alternatives if needed.</p>
              </div>

              <div className="space-y-3">
                {loadingDoctors ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <div className="h-4 w-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                      <span>Loading doctors...</span>
                    </div>
                  </div>
                ) : doctors.length > 0 ? (
                  <>
                    {doctors.map((doctor) => (
                      <button
                        key={doctor.id}
                        type="button"
                        onClick={() => handleInputChange('doctorId', doctor.id)}
                        className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                          formData.doctorId === doctor.id
                            ? 'border-teal-500 bg-teal-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {doctor.profile_image ? (
                            <img src={doctor.profile_image} alt={doctor.name} className="w-12 h-12 rounded-full object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                              <Users className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-slate-900">{doctor.name}</div>
                            <div className="text-sm text-gray-600">{doctor.specialization}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500 mb-2">No doctors available at the moment.</p>
                    <p className="text-xs text-gray-400">Please contact us directly to book your consultation.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Appointment Request */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">When would you like to visit?</h2>
                <p className="text-sm text-gray-600">Our team will confirm your appointment shortly</p>
              </div>

              {/* Show selected doctor if preselected (Step 3 was skipped) */}
              {formData.doctorId && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 uppercase tracking-wide mb-1">Selected Surgeon</p>
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {doctors.find((d) => d.id === formData.doctorId)?.name || 'Selected surgeon'}
                      </p>
                      {doctors.find((d) => d.id === formData.doctorId)?.specialization && (
                        <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">
                          {doctors.find((d) => d.id === formData.doctorId)?.specialization}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        // Allow user to go back and change doctor if needed
                        setCurrentStep(3);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="text-xs text-primary hover:text-primary/80 hover:underline font-medium flex-shrink-0 transition-colors"
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="preferredDate" className="text-sm font-medium text-slate-900">Preferred Date *</Label>
                  <Input
                    id="preferredDate"
                    type="date"
                    value={formData.preferredDate}
                    onChange={(e) => handleInputChange('preferredDate', e.target.value)}
                    min={minDate}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">We'll confirm the exact time after reviewing your inquiry</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timePreference" className="text-sm font-medium text-slate-900">Time Preference *</Label>
                  <Select value={formData.timePreference} onValueChange={(value) => handleInputChange('timePreference', value)}>
                    <SelectTrigger id="timePreference">
                      <SelectValue placeholder="Select preferred time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Morning">Morning (8 AM - 12 PM)</SelectItem>
                      <SelectItem value="Afternoon">Afternoon (12 PM - 5 PM)</SelectItem>
                      <SelectItem value="Evening">Evening (5 PM - 8 PM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-sm font-medium text-slate-900">Additional Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Any special requests or information..."
                    rows={4}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Basic Medical Safety */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">A few safety questions</h2>
                <p className="text-sm text-gray-600">This helps our doctors prepare safely for your consultation</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="isOver18"
                    checked={formData.isOver18}
                    onCheckedChange={(checked) => handleInputChange('isOver18', checked)}
                    className="mt-1"
                  />
                  <Label htmlFor="isOver18" className="text-sm font-medium text-slate-900 cursor-pointer">
                    I am 18 years or older *
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-900">Do you have any known serious medical conditions? *</Label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => handleInputChange('hasSeriousConditions', 'yes')}
                      className={`flex-1 p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        formData.hasSeriousConditions === 'yes'
                          ? 'border-teal-500 bg-teal-50 text-teal-700'
                          : 'border-gray-200 bg-white text-slate-900 hover:border-gray-300'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInputChange('hasSeriousConditions', 'no')}
                      className={`flex-1 p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        formData.hasSeriousConditions === 'no'
                          ? 'border-teal-500 bg-teal-50 text-teal-700'
                          : 'border-gray-200 bg-white text-slate-900 hover:border-gray-300'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-900">Are you currently pregnant? *</Label>
                  <Select value={formData.isPregnant} onValueChange={(value) => handleInputChange('isPregnant', value)}>
                    <SelectTrigger className="h-11 bg-white border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Consent */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Final details</h2>
                <p className="text-sm text-gray-600">Please review and confirm the following</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="contactConsent"
                    checked={formData.contactConsent}
                    onCheckedChange={(checked) => handleInputChange('contactConsent', checked)}
                    className="mt-1"
                  />
                  <Label htmlFor="contactConsent" className="text-sm text-slate-900 cursor-pointer leading-relaxed">
                    I consent to being contacted by Nairobi Sculpt via phone, email, or SMS regarding my consultation request. *
                  </Label>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="privacyConsent"
                    checked={formData.privacyConsent}
                    onCheckedChange={(checked) => handleInputChange('privacyConsent', checked)}
                    className="mt-1"
                  />
                  <Label htmlFor="privacyConsent" className="text-sm text-slate-900 cursor-pointer leading-relaxed">
                    I have read and agree to the{' '}
                    <a href="/privacy" target="_blank" className="text-teal-600 hover:underline">
                      Privacy Policy
                    </a>
                    . *
                  </Label>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="acknowledgmentConsent"
                    checked={formData.acknowledgmentConsent}
                    onCheckedChange={(checked) => handleInputChange('acknowledgmentConsent', checked)}
                    className="mt-1"
                  />
                  <Label htmlFor="acknowledgmentConsent" className="text-sm text-slate-900 cursor-pointer leading-relaxed">
                    I understand that this is a consultation request, not a confirmed appointment, and that this does not constitute medical diagnosis or treatment. *
                  </Label>
                </div>
              </div>
            </div>
          )}

          {/* Step 7: Confirmation */}
          {currentStep === 7 && (
            <div className="space-y-6">
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Review Your Inquiry</h2>
                <p className="text-sm text-gray-600 leading-relaxed">Please confirm the details below before sending</p>
              </div>

              <div className="space-y-3 p-5 bg-gray-50/50 rounded-xl border border-gray-200">
                <div className="flex justify-between items-start py-2 border-b border-gray-200 last:border-0">
                  <span className="text-sm font-medium text-gray-600">Name</span>
                  <span className="text-sm text-slate-900 text-right">{formData.firstName} {formData.lastName}</span>
                </div>
                <div className="flex justify-between items-start py-2 border-b border-gray-200 last:border-0">
                  <span className="text-sm font-medium text-gray-600">Email</span>
                  <span className="text-sm text-slate-900 text-right">{formData.email}</span>
                </div>
                <div className="flex justify-between items-start py-2 border-b border-gray-200 last:border-0">
                  <span className="text-sm font-medium text-gray-600">Phone</span>
                  <span className="text-sm text-slate-900 text-right">{formData.phone}</span>
                </div>
                {formData.preferredDate && (
                  <div className="flex justify-between items-start py-2">
                    <span className="text-sm font-medium text-gray-600">Preferred Date</span>
                    <span className="text-sm text-slate-900 text-right">{format(new Date(formData.preferredDate), 'MMMM d, yyyy')}</span>
                  </div>
                )}
              </div>

              <div className="p-5 bg-primary/5 border border-primary/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <div className="font-medium text-slate-900 mb-1.5">What happens next?</div>
                    <div className="text-gray-600 leading-relaxed">
                      Our care team will review your inquiry and contact you within 24 hours to confirm your consultation time and answer any questions.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-100">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1 || isSubmitting}
            className="min-w-[120px]"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {currentStep < TOTAL_STEPS ? (
            <Button
              type="button"
              onClick={nextStep}
              disabled={!canProceed() || isSubmitting}
              className="min-w-[120px]"
            >
              Continue
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!canProceed() || isSubmitting}
              className="min-w-[160px]"
            >
              {isSubmitting ? (
                <>
                  <span className="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Send Inquiry
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BookConsultationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-700">Loading...</p>
        </div>
      </div>
    }>
      <BookConsultationContent />
    </Suspense>
  );
}
