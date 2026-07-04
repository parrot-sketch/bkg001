'use client';

import { CheckCircle, Stethoscope, User, Calendar, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: number;
  label: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  currentStepIndex: number;
}

export function StepIndicator({ steps, currentStep, currentStepIndex }: StepIndicatorProps) {
  const icons = {
    1: Stethoscope,
    2: User,
    3: Calendar,
    4: FileText,
  };

  return (
    <div className="flex items-center justify-between relative">
      {/* Progress Line */}
      <div className="absolute top-5 left-0 right-0 h-0.5 bg-[#e7d6bf] -z-10" />
      <div 
        className="absolute top-5 left-0 h-0.5 bg-[#caa26a] -z-10 transition-all duration-300"
        style={{ width: `${((currentStepIndex - 1) / (steps.length - 1)) * 100}%` }}
      />

      {steps.map((step, index) => {
        const Icon = icons[step.id as keyof typeof icons] || User;
        const isActive = currentStep === step.id;
        const isCompleted = currentStepIndex > index + 1;

        return (
          <div key={step.id} className="flex flex-col items-center">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
              isActive && "border-[#caa26a] bg-[#caa26a] text-white shadow-lg",
              isCompleted && "border-[#caa26a] bg-[#caa26a] text-white",
              !isActive && !isCompleted && "border-[#e7d6bf] bg-white text-[#2c2e4b]/40"
            )}>
              {isCompleted ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
            </div>
            <span className={cn(
              "text-xs mt-2 font-medium",
              isActive ? "text-[#caa26a]" : isCompleted ? "text-[#2c2e4b]" : "text-[#2c2e4b]/40"
            )}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
