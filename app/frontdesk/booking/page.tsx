'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  Loader2,
  X,
} from 'lucide-react';
import { useBooking } from '@/hooks/frontdesk/booking/useBooking';
import { BookingStepper } from './components/BookingStepper';
import { DoctorSelection } from './components/DoctorSelection';
import { TimeSelection } from './components/TimeSelection';
import { BookingSummary } from './components/BookingSummary';

/* ═══ Main Component ═══ */

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-cyan-600" /></div>}>
      <BookingContent />
    </Suspense>
  );
}

function BookingContent() {
  const router = useRouter();
  const {
    currentStep,
    setCurrentStep,
    patient,
    doctors,
    loading,
    selectedDoctor,
    setSelectedDoctor,
    selectedDate,
    setSelectedDate,
    availableSlots,
    loadingSlots,
    selectedSlot,
    setSelectedSlot,
    appointmentType,
    setAppointmentType,
    reason,
    setReason,
    isSubmitting,
    handleBack,
    handleNext,
    handleBook,
    categorizedSlots,
  } = useBooking();

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center gap-4 text-slate-500">
        <Loader2 className="h-10 w-10 animate-spin text-brand-primary" />
        <p className="font-semibold text-brand-primary tracking-widest uppercase text-xs animate-pulse font-inter">Nairobi Sculpt Aesthetic Centre</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleBack}
              className="rounded-xl hover:bg-slate-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-[1.1]">Schedule Appointment</h1>
              {patient && (
                <p className="text-sm text-slate-500 mt-0.5">
                  Booking for <span className="font-semibold text-brand-primary">{patient.firstName} {patient.lastName}</span>
                </p>
              )}
            </div>
          </div>
          <Button 
            variant="ghost" 
            onClick={() => router.push('/frontdesk/appointments')}
            className="text-slate-500 hover:text-slate-900 rounded-xl"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </header>

      {/* ── Stepper ── */}
      <BookingStepper currentStep={currentStep} />

      {/* ── Workflow Steps ── */}
      <main className="max-w-7xl mx-auto px-6">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          {currentStep === 1 && (
            <DoctorSelection 
              doctors={doctors}
              selectedDoctor={selectedDoctor}
              onSelect={(doctor) => {
                setSelectedDoctor(doctor);
                // Delay transition for better UX feel
                setTimeout(() => setCurrentStep(2), 400);
              }}
            />
          )}

          {currentStep === 2 && (
            <TimeSelection 
              selectedDoctor={selectedDoctor}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              loadingSlots={loadingSlots}
              availableSlots={availableSlots}
              categorizedSlots={categorizedSlots}
              selectedSlot={selectedSlot}
              onSlotSelect={setSelectedSlot}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {currentStep === 3 && (
            <BookingSummary 
              patient={patient}
              selectedDoctor={selectedDoctor}
              selectedDate={selectedDate}
              selectedSlot={selectedSlot}
              appointmentType={appointmentType}
              onAppointmentTypeChange={setAppointmentType}
              reason={reason}
              onReasonChange={setReason}
              isSubmitting={isSubmitting}
              onBook={handleBook}
            />
          )}
        </div>
      </main>
    </div>
  );
}
