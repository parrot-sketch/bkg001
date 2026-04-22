'use client';

import { CheckCircle2, User, Activity, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { num: 1, label: 'Case ID', icon: User },
    { num: 2, label: 'Operative', icon: Activity },
    { num: 3, label: 'Charges', icon: Receipt },
  ];

  return (
    <div className="flex items-center justify-center gap-1 md:gap-2 mb-6 md:mb-8">
      {steps.map((step, idx) => {
        const Icon = step.icon;
        const isActive = currentStep === step.num;
        const isCompleted = currentStep > step.num;

        return (
          <div key={step.num} className="flex items-center">
            {idx > 0 && (
              <div
                className={cn(
                  'w-8 md:w-12 h-0.5 mx-1 md:mx-2',
                  isCompleted ? 'bg-emerald-500' : 'bg-slate-200'
                )}
              />
            )}
            <div
              className={cn(
                'flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 rounded-full transition-colors',
                isActive && 'bg-slate-800 text-white',
                isCompleted && 'bg-emerald-100 text-emerald-700',
                !isActive && !isCompleted && 'bg-slate-100 text-slate-500'
              )}
            >
              {isCompleted ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
              <span className="text-xs md:text-sm font-medium">{step.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
