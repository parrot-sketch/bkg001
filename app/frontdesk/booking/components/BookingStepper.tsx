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
                    "h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-300 border-2",
                    isActive ? "bg-brand-primary border-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-110" : 
                    isCompleted ? "bg-[#f4f1e8] border-[#f4f1e8] text-brand-primary" :
                    "bg-white border-slate-100 text-slate-300"
                  )}
                >
                  {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Icon className={cn("h-5 w-5", isActive && "animate-pulse")} />}
                </div>
                <span className={cn(
                  "text-[10px] font-semibold uppercase tracking-[0.2em] whitespace-nowrap",
                  isActive ? "text-brand-primary" : "text-slate-400"
                )}>
                  {step.name}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className="flex-1 h-[2px] mx-4 bg-slate-100 relative -top-3.5">
                  <div 
                    className="absolute inset-0 bg-brand-primary/40 transition-all duration-500 ease-in-out" 
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
