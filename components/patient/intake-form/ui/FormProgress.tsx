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
          <p className="text-gray-500 mt-1">Step {currentStep} of {totalSteps}</p>
        </div>
        {draftSaved && (
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-600 font-medium">Saved</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-3">
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#caa26a] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Step Indicators */}
        <div className="flex justify-between gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-1"
            >
              <div className={`text-sm font-medium ${i < currentStep ? 'text-[#caa26a]' : 'text-gray-400'}`}>
                {i + 1}
              </div>
              <div
                className={`w-full h-1.5 rounded-full transition-all ${
                  i < currentStep - 1
                    ? 'bg-[#caa26a]'
                    : i === currentStep - 1
                    ? 'bg-[#caa26a]'
                    : 'bg-gray-200'
                }`}
              />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
