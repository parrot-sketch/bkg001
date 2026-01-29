'use client';

import { Card } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

interface FormProgressProps {
  currentStep: number;
  totalSteps: number;
  draftSaved: boolean;
}

export function FormProgress({ currentStep, totalSteps, draftSaved }: FormProgressProps) {
  const progressPercent = (currentStep / totalSteps) * 100;

  return (
    <Card className="bg-white border-0 shadow-sm p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Patient Intake Form</h1>
          <p className="text-gray-600 mt-1">Step {currentStep} of {totalSteps}</p>
        </div>
        {draftSaved && (
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-600 font-medium">Saved</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Step Indicators */}
        <div className="flex justify-between gap-1 mt-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full transition-all ${
                i < currentStep - 1
                  ? 'bg-green-500'
                  : i === currentStep - 1
                  ? 'bg-blue-500'
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}
