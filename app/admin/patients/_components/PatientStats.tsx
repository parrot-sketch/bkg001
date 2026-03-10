'use client';

import { Users, UserPlus, FileText, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';

interface PatientStatsProps {
  patients: PatientResponseDto[];
}

export function PatientStats({ patients }: PatientStatsProps) {
  const totalPatients = patients.length;
  const registeredThisMonth = patients.filter(p => {
    if (!p.createdAt) return false;
    const date = new Date(p.createdAt);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;
  
  const withFileNumber = patients.filter(p => !!p.fileNumber).length;
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        label="Total Records"
        value={totalPatients}
        icon={<Users className="h-4 w-4" />}
        color="text-slate-600 bg-slate-50 border-slate-200"
      />
      <StatCard
        label="New This Month"
        value={registeredThisMonth}
        icon={<UserPlus className="h-4 w-4" />}
        color="text-indigo-600 bg-indigo-50 border-indigo-100"
      />
      <StatCard
        label="Clinical Files"
        value={withFileNumber}
        icon={<FileText className="h-4 w-4" />}
        color="text-emerald-600 bg-emerald-50 border-emerald-100"
      />
      <StatCard
        label="Active Status"
        value="100%"
        icon={<Activity className="h-4 w-4" />}
        color="text-sky-600 bg-sky-50 border-sky-100"
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className={cn('flex items-center gap-3 rounded-2xl border p-4 transition-all', color)}>
      <div className="hidden sm:flex h-9 w-9 rounded-xl items-center justify-center bg-white/50 shadow-sm">
        {icon}
      </div>
      <div>
        <p className="text-xl font-bold tracking-tight">{value}</p>
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{label}</p>
      </div>
    </div>
  );
}
