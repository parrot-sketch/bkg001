'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Users, Stethoscope, BedDouble, Package, Loader2, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

interface DashboardMetrics {
  patients: { totalRecords: number; newToday: number; newThisMonth: number };
  surgicalCases: {
    total: number;
    planning: number;
    wardPrep: number;
    booking: number;
    live: number;
    done: number;
  };
  inventory: {
    totalItems: number;
    lowStockCount: number;
    outOfStockCount: number;
    expiringSoonCount: number;
    totalValue: number;
  };
  recentCases: Array<{
    id: string;
    status: string;
    procedure_name: string;
    procedure_date: string | null;
    diagnosis: string | null;
    created_at: string;
    patient: { id: string; first_name: string; last_name: string; file_number: string | null };
    primary_surgeon: { name: string } | null;
  }>;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'border border-slate-300 bg-slate-100 text-slate-700' },
  PLANNING: { label: 'Planning', className: 'border border-amber-300 bg-amber-100 text-amber-800' },
  READY_FOR_SCHEDULING: { label: 'Ready for Scheduling', className: 'border border-blue-300 bg-blue-100 text-blue-800' },
  READY_FOR_WARD_PREP: { label: 'Ward Prep', className: 'border border-emerald-300 bg-emerald-100 text-emerald-800' },
  IN_WARD_PREP: { label: 'In Ward Prep', className: 'border border-amber-300 bg-amber-100 text-amber-800' },
  READY_FOR_THEATER_BOOKING: { label: 'Ready for Booking', className: 'border border-slate-300 bg-slate-100 text-slate-700' },
  SCHEDULED: { label: 'Scheduled', className: 'border border-indigo-300 bg-indigo-100 text-indigo-800' },
  IN_PREP: { label: 'In Prep', className: 'border border-amber-300 bg-amber-100 text-amber-800' },
  IN_THEATER: { label: 'In Theater', className: 'border border-red-300 bg-red-100 text-red-800' },
  RECOVERY: { label: 'Recovery', className: 'border border-emerald-300 bg-emerald-100 text-emerald-800' },
  COMPLETED: { label: 'Completed', className: 'border border-emerald-300 bg-emerald-100 text-emerald-800' },
  CANCELLED: { label: 'Cancelled', className: 'border border-red-300 bg-red-100 text-red-800' },
};

export function TheaterTechDashboardMetrics() {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['theater-tech', 'dashboard'],
    queryFn: async () => {
      const result = await apiClient.get('/theater-tech/dashboard');
      if (!result.success) throw new Error(result.error);
      return result.data as DashboardMetrics;
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl border border-[#e7d6bf]/60 bg-[#e7d6bf]/10 animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-xl border border-[#e7d6bf]/60 bg-[#e7d6bf]/10 animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm font-medium text-red-600">Failed to load metrics</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-2 text-xs font-medium text-red-600 underline underline-offset-2"
        >
          Retry
        </button>
      </div>
    );
  }

  const patients = data?.patients;
  const cases = data?.surgicalCases;
  const inventory = data?.inventory;
  const recentCases = data?.recentCases || [];

  const metricCards = [
    { label: 'Patients', value: patients?.totalRecords ?? 0, icon: Users, accent: 'text-[#caa26a]', href: '/theater-tech/patients' },
    { label: 'Inventory Items', value: inventory?.totalItems ?? 0, icon: Package, accent: 'text-cyan-600', href: '/theater-tech/inventory' },
    { label: 'Surgical Cases', value: cases?.total ?? 0, icon: Stethoscope, accent: 'text-blue-600', href: '/theater-tech/surgical-cases' },
    { label: 'Ward Prep', value: cases?.wardPrep ?? 0, icon: BedDouble, accent: 'text-violet-600', href: '/theater-tech/surgical-cases' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metricCards.map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={() => router.push(card.href)}
            className="rounded-xl border border-[#e7d6bf]/60 bg-white/90 px-4 py-4 flex items-center gap-3 text-left hover:shadow-md hover:border-[#caa26a]/40 hover:bg-white transition-all group cursor-pointer"
          >
            <div className="h-10 w-10 rounded-lg bg-[#e7d6bf]/20 flex items-center justify-center shrink-0 group-hover:bg-[#caa26a]/10 transition-colors">
              <card.icon className={`h-5 w-5 ${card.accent}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xl font-bold text-[#2c2e4b] tabular-nums leading-tight">
                {card.value}
              </p>
              <p className="text-[11px] text-[#2c2e4b]/50 font-medium truncate">{card.label}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-[#2c2e4b]/20 group-hover:text-[#caa26a] transition-colors shrink-0" />
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-[#e7d6bf]/60 bg-white/95 backdrop-blur shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-[#e7d6bf]/60 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#2c2e4b]">Recent Surgical Cases</h3>
          <button
            type="button"
            onClick={() => router.push('/theater-tech/surgical-cases')}
            className="text-xs text-[#caa26a] hover:text-[#b8913e] font-medium"
          >
            View all
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#e7d6bf]/10">
                <th className="text-left px-4 py-2 text-xs font-medium text-[#2c2e4b]/70">Patient</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-[#2c2e4b]/70">Procedure</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-[#2c2e4b]/70">Surgeon</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-[#2c2e4b]/70">Status</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-[#2c2e4b]/70">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e7d6bf]/40">
              {recentCases.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#2c2e4b]/50 text-xs">
                    No recent surgical cases found
                  </td>
                </tr>
              ) : (
                recentCases.map((c) => {
                  const statusCfg = STATUS_CONFIG[c.status] || { label: c.status, className: 'border border-slate-300 bg-slate-100 text-slate-700' };
                  return (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/theater-tech/surgical-cases/${c.id}`)}
                      className="hover:bg-[#e7d6bf]/10 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex flex-col">
                          <span className="font-medium text-[#2c2e4b] underline underline-offset-2">
                            {c.patient.first_name} {c.patient.last_name}
                          </span>
                          {c.patient.file_number && (
                            <span className="text-xs text-[#2c2e4b]/50 font-mono">#{c.patient.file_number}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-sm text-[#2c2e4b]">{c.procedure_name || 'Unnamed procedure'}</span>
                        {c.diagnosis && (
                          <span className="text-xs text-[#2c2e4b]/50 block truncate max-w-[200px]" title={c.diagnosis}>{c.diagnosis}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-[#2c2e4b]/80">
                        {c.primary_surgeon?.name || '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${statusCfg.className}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-[#2c2e4b]/60">
                        {c.created_at ? format(new Date(c.created_at), 'MMM d, yyyy') : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
