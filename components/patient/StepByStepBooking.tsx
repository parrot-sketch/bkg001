'use client';

/**
 * Step-by-Step Consultation Request Workflow
 * 
 * Premium 7-step consultation request submission process for aesthetic surgery clinic:
 * Step 1: Select procedure of interest
 * Step 2: Select surgeon
 * Step 3: Preferred date selection
 * Step 4: Preferred time window
 * Step 5: Additional information
 * Step 6: Review request
 * Step 7: Request consultation
 * 
 * This is NOT a direct booking - it's a consultation request that requires frontdesk review.
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Calendar, Clock, User, FileText, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DoctorSelect } from '@/components/patient/DoctorSelect';
import { DoctorProfileModal } from '@/components/patient/DoctorProfileModal';
import { patientApi } from '@/lib/api/patient';
import { doctorApi } from '@/lib/api/doctor';
import type { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';
import { toast } from 'sonner';

interface BookingData {
  procedureType: string;
  doctorId: string;
  preferredDate: string;
  timeWindow: string;
  specificTime?: string;
  medicalHistory?: string;
  goals?: string;
  questions?: string;
  notes: string;
}

interface StepByStepBookingProps {
  patientId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const BOOKING_STEPS = 7;

const PROCEDURE_TYPES = [
  { value: 'Rhinoplasty', label: 'Rhinoplasty' },
  { value: 'BBL', label: 'BBL (Brazilian Butt Lift)' },
  { value: 'Liposuction', label: 'Liposuction' },
  { value: 'Breast Surgery', label: 'Breast Surgery' },
  { value: 'Skin Procedures', label: 'Skin Procedures' },
  { value: 'Other', label: 'Other' },
];

const TIME_WINDOWS = [
  { value: 'morning', label: 'Morning (8:00 AM - 12:00 PM)' },
  { value: 'afternoon', label: 'Afternoon (12:00 PM - 5:00 PM)' },
  { value: 'evening', label: 'Evening (5:00 PM - 8:00 PM)' },
  { value: 'flexible', label: 'Flexible - Any time works' },
];

export function StepByStepBooking({ patientId, onSuccess, onCancel }: StepByStepBookingProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [bookingData, setBookingData] = useState<BookingData>({
    procedureType: '',
    doctorId: '',
    preferredDate: '',
    timeWindow: '',
    specificTime: '',
    medicalHistory: '',
    goals: '',
    questions: '',
    notes: '',
  });
  const [doctors, setDoctors] = useState<DoctorResponseDto[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDoctorProfile, setSelectedDoctorProfile] = useState<DoctorResponseDto | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof BookingData, string>>>({});

  useEffect(() => {
    if (currentStep === 2) {
      loadDoctors();
    }
  }, [currentStep]);

  const loadDoctors = async () => {
    setLoadingDoctors(true);
    try {
      const response = await patientApi.getAllDoctors();
      if (response.success && response.data) {
        setDoctors(response.data);
      } else if (!response.success) {
        toast.error(response.error || 'Failed to load doctors');
      } else {
        toast.error('Failed to load doctors');
      }
    } catch (error) {
      console.error('Error loading doctors:', error);
      toast.error('An error occurred while loading doctors');
    } finally {
      setLoadingDoctors(false);
    }
  };

  const handleViewProfile = async (doctorId: string) => {
    try {
      const response = await doctorApi.getDoctor(doctorId);
      if (response.success && response.data) {
        setSelectedDoctorProfile(response.data);
        setShowProfileModal(true);
      }
    } catch (error) {
      console.error('Error loading doctor profile:', error);
    }
  };

  const updateField = (field: keyof BookingData, value: string) => {
    setBookingData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<Record<keyof BookingData, string>> = {};

    switch (step) {
      case 1:
        if (!bookingData.procedureType) newErrors.procedureType = 'Please select a procedure';
        break;
      case 2:
        if (!bookingData.doctorId) newErrors.doctorId = 'Please select a surgeon';
        break;
      case 3:
        if (!bookingData.preferredDate) newErrors.preferredDate = 'Please select a preferred date';
        break;
      case 4:
        if (!bookingData.timeWindow) newErrors.timeWindow = 'Please select a time preference';
        break;
      // Steps 5, 6, 7 are optional or review steps
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, BOOKING_STEPS));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    // Validate all required steps
    if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !validateStep(4)) {
      toast.error('Please complete all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      // Combine all notes into a single note field
      const combinedNotes = [
        bookingData.notes,
        bookingData.medicalHistory && `Medical History: ${bookingData.medicalHistory}`,
        bookingData.goals && `Goals: ${bookingData.goals}`,
        bookingData.questions && `Questions: ${bookingData.questions}`,
        bookingData.timeWindow && `Preferred Time: ${TIME_WINDOWS.find(t => t.value === bookingData.timeWindow)?.label}`,
        bookingData.specificTime && `Specific Time Preference: ${bookingData.specificTime}`,
      ].filter(Boolean).join('\n\n');

      const response = await patientApi.scheduleAppointment({
        patientId,
        doctorId: bookingData.doctorId,
        appointmentDate: new Date(bookingData.preferredDate),
        time: bookingData.specificTime || '09:00', // Default time if not specified
        type: bookingData.procedureType,
        note: combinedNotes,
      });

      if (response.success) {
        toast.success('Your consultation request has been submitted. We will review it and contact you shortly.');
        onSuccess();
      } else if (!response.success) {
        toast.error(response.error || 'Failed to submit consultation request');
      } else {
        toast.error('Failed to submit consultation request');
      }
    } catch (error) {
      toast.error('An error occurred while submitting your consultation request');
      console.error('Error submitting consultation request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderProgressDots = () => {
    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {Array.from({ length: BOOKING_STEPS }).map((_, index) => {
          const step = index + 1;
          const isActive = step === currentStep;
          const isCompleted = step < currentStep;

          return (
            <div
              key={step}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                isCompleted
                  ? 'w-8 bg-primary'
                  : isActive
                    ? 'w-8 bg-accent'
                    : 'w-2 bg-muted',
              )}
              aria-label={`Step ${step}${isActive ? ', current' : isCompleted ? ', completed' : ''}`}
            />
          );
        })}
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Procedure of Interest</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Which procedure would you like to explore with our clinic?
            </p>
            <div className="space-y-2">
              <Label htmlFor="procedureType">Select a procedure *</Label>
              <select
                id="procedureType"
                value={bookingData.procedureType}
                onChange={(e) => updateField('procedureType', e.target.value)}
                className={cn(
                  'flex h-12 w-full rounded-md border border-input bg-background px-4 py-2 text-sm',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  errors.procedureType ? 'border-destructive' : '',
                )}
                aria-invalid={!!errors.procedureType}
                aria-describedby={errors.procedureType ? 'procedureType-error' : undefined}
              >
                <option value="">Select a procedure...</option>
                {PROCEDURE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {errors.procedureType && (
                <p id="procedureType-error" className="text-sm text-destructive">
                  {errors.procedureType}
                </p>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <User className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Select Your Surgeon</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Choose your preferred surgeon. You can view their profile to learn more.
            </p>
            {loadingDoctors ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="ml-3 text-muted-foreground">Loading surgeons...</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="doctor">Select a surgeon *</Label>
                <DoctorSelect
                  doctors={doctors}
                  value={bookingData.doctorId}
                  onValueChange={(value) => updateField('doctorId', value)}
                  onViewProfile={handleViewProfile}
                  placeholder="Choose your preferred surgeon..."
                  disabled={isSubmitting}
                  required
                />
                {errors.doctorId && (
                  <p className="text-sm text-destructive">{errors.doctorId}</p>
                )}
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <Calendar className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Preferred Date</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              When would you prefer to have your consultation? We'll do our best to accommodate your preference.
            </p>
            <div className="space-y-2">
              <Label htmlFor="preferredDate">
                <Calendar className="inline h-4 w-4 mr-1" />
                Preferred Date *
              </Label>
              <Input
                id="preferredDate"
                type="date"
                value={bookingData.preferredDate}
                onChange={(e) => updateField('preferredDate', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className={errors.preferredDate ? 'border-destructive' : ''}
                aria-invalid={!!errors.preferredDate}
              />
              {errors.preferredDate && (
                <p className="text-sm text-destructive">{errors.preferredDate}</p>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <Clock className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Preferred Time Window</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              What time of day works best for you?
            </p>
            <div className="space-y-2">
              <Label htmlFor="timeWindow">Time Preference *</Label>
              <select
                id="timeWindow"
                value={bookingData.timeWindow}
                onChange={(e) => updateField('timeWindow', e.target.value)}
                className={cn(
                  'flex h-12 w-full rounded-md border border-input bg-background px-4 py-2 text-sm',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  errors.timeWindow ? 'border-destructive' : '',
                )}
                aria-invalid={!!errors.timeWindow}
              >
                <option value="">Select time preference...</option>
                {TIME_WINDOWS.map((window) => (
                  <option key={window.value} value={window.value}>
                    {window.label}
                  </option>
                ))}
              </select>
              {errors.timeWindow && (
                <p className="text-sm text-destructive">{errors.timeWindow}</p>
              )}
              {bookingData.timeWindow && bookingData.timeWindow !== 'flexible' && (
                <div className="mt-4 space-y-2">
                  <Label htmlFor="specificTime">Specific Time (Optional)</Label>
                  <Input
                    id="specificTime"
                    type="time"
                    value={bookingData.specificTime || ''}
                    onChange={(e) => updateField('specificTime', e.target.value)}
                    placeholder="e.g., 10:00 AM"
                  />
                  <p className="text-xs text-muted-foreground">
                    If you have a specific time preference, you can enter it here.
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Additional Information</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Help us understand your needs better. All information is optional but helps us prepare for your consultation.
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="medicalHistory">Medical History (Optional)</Label>
                <Textarea
                  id="medicalHistory"
                  value={bookingData.medicalHistory || ''}
                  onChange={(e) => updateField('medicalHistory', e.target.value)}
                  placeholder="Any relevant medical history, allergies, or current medications..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goals">Goals and Expectations (Optional)</Label>
                <Textarea
                  id="goals"
                  value={bookingData.goals || ''}
                  onChange={(e) => updateField('goals', e.target.value)}
                  placeholder="What are you hoping to achieve? What are your expectations?"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="questions">Questions or Concerns (Optional)</Label>
                <Textarea
                  id="questions"
                  value={bookingData.questions || ''}
                  onChange={(e) => updateField('questions', e.target.value)}
                  placeholder="Any questions you'd like to discuss during the consultation..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        );

      case 6:
        const selectedDoctor = doctors.find((d) => d.id === bookingData.doctorId);
        const selectedProcedure = PROCEDURE_TYPES.find((p) => p.value === bookingData.procedureType);
        const selectedTimeWindow = TIME_WINDOWS.find((t) => t.value === bookingData.timeWindow);

        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-2 mb-4">
              <Check className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Review Your Request</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Please review all information before submitting. You can go back to edit any step.
            </p>
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Procedure</p>
                    <p className="font-medium">{selectedProcedure?.label || bookingData.procedureType}</p>
                  </div>

                  {selectedDoctor && (
                    <div>
                      <p className="text-sm text-muted-foreground">Surgeon</p>
                      <p className="font-medium">
                        {selectedDoctor.title} {selectedDoctor.firstName} {selectedDoctor.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">{selectedDoctor.specialization}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-muted-foreground">Preferred Date</p>
                    <p className="font-medium">
                      {bookingData.preferredDate && new Date(bookingData.preferredDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>

                  {selectedTimeWindow && (
                    <div>
                      <p className="text-sm text-muted-foreground">Time Preference</p>
                      <p className="font-medium">{selectedTimeWindow.label}</p>
                      {bookingData.specificTime && (
                        <p className="text-sm text-muted-foreground">Specific time: {bookingData.specificTime}</p>
                      )}
                    </div>
                  )}

                  {bookingData.medicalHistory && (
                    <div>
                      <p className="text-sm text-muted-foreground">Medical History</p>
                      <p className="text-sm">{bookingData.medicalHistory}</p>
                    </div>
                  )}

                  {bookingData.goals && (
                    <div>
                      <p className="text-sm text-muted-foreground">Goals</p>
                      <p className="text-sm">{bookingData.goals}</p>
                    </div>
                  )}

                  {bookingData.questions && (
                    <div>
                      <p className="text-sm text-muted-foreground">Questions</p>
                      <p className="text-sm">{bookingData.questions}</p>
                    </div>
                  )}

                  {bookingData.notes && (
                    <div>
                      <p className="text-sm text-muted-foreground">Additional Notes</p>
                      <p className="text-sm">{bookingData.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-2 mb-4">
              <Check className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Request Consultation</h2>
            </div>
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-sm font-medium mb-2">What happens next?</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Your consultation request will be reviewed by our surgical team</li>
                  <li>We'll contact you within 24-48 hours</li>
                  <li>If accepted, we'll propose a specific session time</li>
                  <li>You'll be able to confirm the session once proposed</li>
                </ul>
              </div>
              {isSubmitting && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Submitting your consultation request...</p>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div className="w-full max-w-2xl mx-auto">
        {/* Progress Dots */}
        {renderProgressDots()}

        {/* Step Content */}
        <Card>
          <CardContent className="p-4 sm:p-6 min-h-[400px]">
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-6 gap-2">
          {currentStep === 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={isSubmitting}
              className="flex-1"
              aria-label="Previous step"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
          )}

          {currentStep < BOOKING_STEPS ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting}
              className="flex-1"
              aria-label="Next step"
            >
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1"
              aria-label="Confirm booking"
            >
              {isSubmitting ? 'Submitting...' : 'Request Consultation'}
            </Button>
          )}
        </div>
      </div>

      {/* Doctor Profile Modal */}
      {selectedDoctorProfile && (
        <DoctorProfileModal
          open={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          doctor={selectedDoctorProfile}
        />
      )}
    </>
  );
}
