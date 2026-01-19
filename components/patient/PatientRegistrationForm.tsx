'use client';

/**
 * Patient Registration Form - Multi-Step
 * 
 * Mobile-optimized multi-step registration form with progress indicators.
 * Steps:
 * 1. Personal Information
 * 2. Contact Information
 * 3. Emergency Contact
 * 4. Medical History & Allergies
 * 5. Consents
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormData {
  // Step 1: Personal Information
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  nationalId: string;

  // Step 2: Contact Information
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;

  // Step 3: Emergency Contact
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;

  // Step 4: Medical History
  medicalHistory: string;
  allergies: string;
  currentMedications: string;

  // Step 5: Consents
  privacyConsent: boolean;
  procedureConsent: boolean;
  communicationConsent: boolean;
}

interface PatientRegistrationFormProps {
  initialData?: Partial<FormData>;
  onSubmit: (data: FormData) => Promise<void>;
  isLoading?: boolean;
}

const TOTAL_STEPS = 5;

export function PatientRegistrationForm({
  initialData,
  onSubmit,
  isLoading = false,
}: PatientRegistrationFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    nationalId: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    medicalHistory: '',
    allergies: '',
    currentMedications: '',
    privacyConsent: false,
    procedureConsent: false,
    communicationConsent: false,
    ...initialData,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const updateField = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    switch (step) {
      case 1:
        if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
        if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
        if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
        if (!formData.gender) newErrors.gender = 'Gender is required';
        break;

      case 2:
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
          newErrors.email = 'Invalid email format';
        if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
        break;

      case 3:
        if (!formData.emergencyContactName.trim())
          newErrors.emergencyContactName = 'Emergency contact name is required';
        if (!formData.emergencyContactPhone.trim())
          newErrors.emergencyContactPhone = 'Emergency contact phone is required';
        break;

      case 4:
        // Medical history is optional, no validation needed
        break;

      case 5:
        if (!formData.privacyConsent) newErrors.privacyConsent = 'Privacy consent is required';
        if (!formData.procedureConsent) newErrors.procedureConsent = 'Procedure consent is required';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (validateStep(TOTAL_STEPS)) {
      await onSubmit(formData);
    }
  };

  const renderProgressIndicator = () => {
    return (
      <div className="mb-6 px-2">
        <div className="flex items-center justify-between mb-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, index) => {
            const step = index + 1;
            const isActive = step === currentStep;
            const isCompleted = step < currentStep;

            return (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                      isCompleted
                        ? 'bg-primary text-primary-foreground'
                        : isActive
                          ? 'bg-accent text-accent-foreground ring-2 ring-accent ring-offset-2'
                          : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : step}
                  </div>
                  {step < TOTAL_STEPS && (
                    <div
                      className={cn(
                        'h-0.5 w-full mt-1 -mb-4 transition-colors',
                        isCompleted ? 'bg-primary' : 'bg-muted',
                      )}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-center text-muted-foreground mt-4">
          Step {currentStep} of {TOTAL_STEPS}
        </p>
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground mb-4">Personal Information</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => updateField('firstName', e.target.value)}
                  placeholder="John"
                  className={errors.firstName ? 'border-destructive' : ''}
                  aria-invalid={!!errors.firstName}
                  aria-describedby={errors.firstName ? 'firstName-error' : undefined}
                />
                {errors.firstName && (
                  <p id="firstName-error" className="text-sm text-destructive">
                    {errors.firstName}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => updateField('lastName', e.target.value)}
                  placeholder="Doe"
                  className={errors.lastName ? 'border-destructive' : ''}
                  aria-invalid={!!errors.lastName}
                />
                {errors.lastName && (
                  <p className="text-sm text-destructive">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">
                Date of Birth <span className="text-destructive">*</span>
              </Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => updateField('dateOfBirth', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className={errors.dateOfBirth ? 'border-destructive' : ''}
                aria-invalid={!!errors.dateOfBirth}
              />
              {errors.dateOfBirth && (
                <p className="text-sm text-destructive">{errors.dateOfBirth}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">
                Gender <span className="text-destructive">*</span>
              </Label>
              <select
                id="gender"
                value={formData.gender}
                onChange={(e) => updateField('gender', e.target.value)}
                className={cn(
                  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  errors.gender ? 'border-destructive' : '',
                )}
                aria-invalid={!!errors.gender}
              >
                <option value="">Select gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
                <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
              </select>
              {errors.gender && (
                <p className="text-sm text-destructive">{errors.gender}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nationalId">National ID / Passport Number</Label>
              <Input
                id="nationalId"
                value={formData.nationalId}
                onChange={(e) => updateField('nationalId', e.target.value)}
                placeholder="ID or Passport Number"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground mb-4">Contact Information</h2>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="you@example.com"
                className={errors.email ? 'border-destructive' : ''}
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="+254 700 000 000"
                className={errors.phone ? 'border-destructive' : ''}
                aria-invalid={!!errors.phone}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
                placeholder="Street address"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  placeholder="Nairobi"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => updateField('postalCode', e.target.value)}
                  placeholder="00100"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground mb-4">Emergency Contact</h2>

            <div className="space-y-2">
              <Label htmlFor="emergencyContactName">
                Contact Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={(e) => updateField('emergencyContactName', e.target.value)}
                placeholder="Full name"
                className={errors.emergencyContactName ? 'border-destructive' : ''}
                aria-invalid={!!errors.emergencyContactName}
              />
              {errors.emergencyContactName && (
                <p className="text-sm text-destructive">{errors.emergencyContactName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergencyContactPhone">
                Contact Phone <span className="text-destructive">*</span>
              </Label>
              <Input
                id="emergencyContactPhone"
                type="tel"
                value={formData.emergencyContactPhone}
                onChange={(e) => updateField('emergencyContactPhone', e.target.value)}
                placeholder="+254 700 000 000"
                className={errors.emergencyContactPhone ? 'border-destructive' : ''}
                aria-invalid={!!errors.emergencyContactPhone}
              />
              {errors.emergencyContactPhone && (
                <p className="text-sm text-destructive">{errors.emergencyContactPhone}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergencyContactRelation">Relationship</Label>
              <Input
                id="emergencyContactRelation"
                value={formData.emergencyContactRelation}
                onChange={(e) => updateField('emergencyContactRelation', e.target.value)}
                placeholder="e.g., Spouse, Parent, Friend"
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground mb-4">Medical History & Allergies</h2>

            <div className="space-y-2">
              <Label htmlFor="medicalHistory">Medical History</Label>
              <Textarea
                id="medicalHistory"
                value={formData.medicalHistory}
                onChange={(e) => updateField('medicalHistory', e.target.value)}
                placeholder="Any relevant medical conditions or history"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">Optional - Please share any relevant medical history</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="allergies">Allergies</Label>
              <Textarea
                id="allergies"
                value={formData.allergies}
                onChange={(e) => updateField('allergies', e.target.value)}
                placeholder="Known allergies (medications, foods, etc.)"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">Please list all known allergies</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentMedications">Current Medications</Label>
              <Textarea
                id="currentMedications"
                value={formData.currentMedications}
                onChange={(e) => updateField('currentMedications', e.target.value)}
                placeholder="Current medications and dosages"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">List all current medications</p>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Consents & Agreements</h2>

            <div className="space-y-4">
              <div className="flex items-start space-x-3 p-4 border rounded-lg">
                <Checkbox
                  id="privacyConsent"
                  checked={formData.privacyConsent}
                  onCheckedChange={(checked) => updateField('privacyConsent', checked as boolean)}
                  className={errors.privacyConsent ? 'border-destructive' : ''}
                  aria-invalid={!!errors.privacyConsent}
                />
                <div className="flex-1">
                  <Label htmlFor="privacyConsent" className="font-medium cursor-pointer">
                    Privacy Policy Consent <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    I consent to the collection and processing of my personal information as outlined in the privacy
                    policy.
                  </p>
                  {errors.privacyConsent && (
                    <p className="text-sm text-destructive mt-1">{errors.privacyConsent}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 border rounded-lg">
                <Checkbox
                  id="procedureConsent"
                  checked={formData.procedureConsent}
                  onCheckedChange={(checked) => updateField('procedureConsent', checked as boolean)}
                  className={errors.procedureConsent ? 'border-destructive' : ''}
                  aria-invalid={!!errors.procedureConsent}
                />
                <div className="flex-1">
                  <Label htmlFor="procedureConsent" className="font-medium cursor-pointer">
                    Procedure Consent <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    I understand the procedures and consent to treatment as discussed with my doctor.
                  </p>
                  {errors.procedureConsent && (
                    <p className="text-sm text-destructive mt-1">{errors.procedureConsent}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 border rounded-lg">
                <Checkbox
                  id="communicationConsent"
                  checked={formData.communicationConsent}
                  onCheckedChange={(checked) => updateField('communicationConsent', checked as boolean)}
                />
                <div className="flex-1">
                  <Label htmlFor="communicationConsent" className="font-medium cursor-pointer">
                    Communication Consent (Optional)
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    I consent to receive appointment reminders, health tips, and promotional communications via email and
                    SMS.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="p-4 sm:p-6">
        {/* Progress Indicator */}
        {renderProgressIndicator()}

        {/* Step Content */}
        <div className="min-h-[400px]">{renderStepContent()}</div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1 || isLoading}
            className="flex-1 sm:flex-initial"
            aria-label="Previous step"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          {currentStep < TOTAL_STEPS ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={isLoading}
              className="flex-1 sm:flex-initial"
              aria-label="Next step"
            >
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 sm:flex-initial"
              aria-label="Submit registration"
            >
              {isLoading ? 'Submitting...' : 'Submit Registration'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
