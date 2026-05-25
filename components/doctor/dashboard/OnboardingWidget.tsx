'use client';

import { useState } from 'react';
import { Activity, ArrowRight, Info, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useOnboardingTour } from '@/components/doctor/onboarding-tour/OnboardingTourContext';

interface OnboardingWidgetProps {
  user: any;
  show: boolean;
  isLoading: boolean;
}

export function OnboardingWidget({ user, show, isLoading }: OnboardingWidgetProps) {
  const { resumeTour, isActive, isFirstTime } = useOnboardingTour();
  const [dismissed, setDismissed] = useState(false);

  if (!show || isLoading || dismissed || isActive) return null;

  return (
    <TooltipProvider>
      <div className="relative rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/30 to-white p-4 shadow-sm overflow-hidden">
        {/* Subtle decorative glow */}
        <div
          className="pointer-events-none absolute -top-6 -right-6 h-24 w-24 rounded-full bg-indigo-400/10 blur-2xl"
          aria-hidden
        />

        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="mt-0.5 h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Activity className="h-5 w-5" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900">
                {isFirstTime ? 'Start account setup' : 'Finish account setup'}
              </h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
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
              Hi Dr. {user?.firstName || 'Doctor'} — {isFirstTime ? 'let’s get your profile and schedule set up.' : 'complete your profile and schedule to activate your account.'}
            </p>
          </div>

          {/* Dismiss */}
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="shrink-0 h-6 w-6 flex items-center justify-center rounded-md text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="Dismiss setup reminder"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Action row */}
        <div className="flex items-center gap-2 mt-3 pl-12">
          {/* Primary: launch the guided tour */}
          {!isActive && (
            <Button
              size="sm"
              onClick={resumeTour}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 text-xs h-8 px-3 gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {isFirstTime ? 'Start Setup' : 'Resume Setup'}
            </Button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
