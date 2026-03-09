import { Stethoscope, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BookingStep } from '@/hooks/frontdesk/booking/useBooking';

interface BookingStepperProps {
  currentStep: BookingStep;
}

export function BookingStepper({ currentStep }: BookingStepperProps) {
  const steps = [
    { id: 1, name: 'Select Doctor', icon: Stethoscope },
    { id: 2, name: 'Choose Time', icon: Clock },
    { id: 3, name: 'Final Details', icon: CheckCircle2 },
  ];

  return (
    <div className="flex items-center justify-center py-8">
      <div className="flex items-center gap-2 max-w-2xl w-full px-6">
        {steps.map((step, idx) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-2 relative">
                <div 
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300 border",
                    isActive ? "bg-slate-900 border-slate-900 text-white" : 
                    isCompleted ? "bg-slate-100 border-slate-200 text-slate-700" :
                    "bg-white border-slate-200 text-slate-300"
                  )}
                >
                  {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className={cn(
                  "text-xs font-medium whitespace-nowrap",
                  isActive ? "text-slate-900" : "text-slate-500"
                )}>
                  {step.name}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className="flex-1 h-px mx-4 bg-slate-200 relative -top-3">
                  <div 
                    className="absolute inset-0 bg-slate-900 transition-all duration-500 ease-in-out" 
                    style={{ width: isCompleted ? '100%' : '0%' }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
