'use client';

import { useState } from 'react';
import { Activity, ArrowRight, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDoctorProfile } from '@/hooks/use-doctor-dashboard';
import { useOnboardingTour } from '@/components/doctor/onboarding-tour/OnboardingTourContext';

interface OnboardingWidgetProps {
  show: boolean;
  isLoading: boolean;
}

export function OnboardingWidget({ show, isLoading }: OnboardingWidgetProps) {
  const doctor = useDoctorProfile();
  const { resumeTour, isActive, isFirstTime } = useOnboardingTour();
  const [dismissed, setDismissed] = useState(false);

  if (!show || isLoading || dismissed || isActive) return null;

  return (
    <TooltipProvider>
      <div className="relative rounded-xl border border-[#0c5d69]/10 bg-white p-4 shadow-sm overflow-hidden">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-9 w-9 rounded-lg bg-[#e6f0f1] flex items-center justify-center shrink-0">
            <Activity className="h-5 w-5 text-[#0c5d69]" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#121c1d]">
                {isFirstTime ? 'Start account setup' : 'Finish account setup'}
              </h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    aria-label="Onboarding help"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[260px]">
                  The tour will guide you through: Profile → Billing → Schedule. Takes about 3 minutes.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Hi Dr. {doctor?.firstName || 'Doctor'} — {isFirstTime ? 'let\'s get your profile and schedule set up.' : 'complete your profile and schedule to activate your account.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="shrink-0 h-6 w-6 flex items-center justify-center rounded-md text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="Dismiss setup reminder"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2 mt-3 pl-12">
          {!isActive && (
            <Button
              size="sm"
              onClick={resumeTour}
              className="bg-[#0c5d69] hover:bg-[#0a4f59] text-white shadow-sm text-xs h-8 px-3 gap-1.5"
            >
              {isFirstTime ? 'Start Setup' : 'Resume Setup'}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
