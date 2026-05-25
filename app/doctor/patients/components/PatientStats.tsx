'use client';

interface PatientStatsProps {
  stats: {
    total: number;
    newThisMonth: number;
    withAllergies: number;
    withConditions: number;
  };
  loading: boolean;
}

export function PatientStats({ stats, loading }: PatientStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <div className="border border-slate-200 bg-white px-4 py-3">
        <div className="text-xl font-semibold text-slate-900">{loading ? '–' : stats.total}</div>
        <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Patients</div>
      </div>
      <div className="border border-slate-200 bg-white px-4 py-3">
        <div className="text-xl font-semibold text-slate-900">{loading ? '–' : stats.newThisMonth}</div>
        <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">New this month</div>
      </div>
      <div className="border border-slate-200 bg-white px-4 py-3">
        <div className="text-xl font-semibold text-slate-900">{loading ? '–' : stats.withAllergies}</div>
        <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">With allergies</div>
      </div>
      <div className="border border-slate-200 bg-white px-4 py-3">
        <div className="text-xl font-semibold text-slate-900">{loading ? '–' : stats.withConditions}</div>
        <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Medical conditions</div>
      </div>
    </div>
  );
}
