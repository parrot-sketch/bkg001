'use client';

import { Activity, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface OnboardingWidgetProps {
  user: any;
  show: boolean;
  isLoading: boolean;
}

export function OnboardingWidget({ user, show, isLoading }: OnboardingWidgetProps) {
  if (!show || isLoading) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-10">
        <Activity className="h-32 w-32" />
      </div>
      <div className="relative z-10">
        <h2 className="text-2xl font-bold mb-2">Welcome, Dr. {user?.firstName || 'Doctor'}!</h2>
        <p className="text-indigo-100 mb-6 max-w-xl">
          Your account is active. To start receiving appointments, please configure your weekly availability and complete your professional profile.
        </p>
        <div className="flex gap-4">
          <Button asChild variant="secondary" className="font-semibold">
            <Link href="/doctor/profile">
              Complete Setup
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
