'use client';

import { Users, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PatientHeader() {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Patient Directory</h2>
        <p className="text-slate-500 font-medium">Global access to Nairobi Sculpt clinical records</p>
      </div>
      <div className="flex items-center gap-2">
        {/* Admin might not add patients directly, usually frontdesk does, but keep it for symmetry if needed */}
        <Button className="rounded-xl bg-slate-900 shadow-lg shadow-slate-900/10">
          <UserPlus className="mr-2 h-4 w-4" />
          Register Patient
        </Button>
      </div>
    </div>
  );
}
