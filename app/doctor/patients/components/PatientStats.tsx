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
      <div className="border border-[#e7d6bf] bg-white px-4 py-3">
        <div className="text-xl font-semibold text-[#2c2e4b]">{loading ? '–' : stats.total}</div>
        <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#2c2e4b]/60">Patients</div>
      </div>
      <div className="border border-[#e7d6bf] bg-white px-4 py-3">
        <div className="text-xl font-semibold text-[#2c2e4b]">{loading ? '–' : stats.newThisMonth}</div>
        <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#2c2e4b]/60">New this month</div>
      </div>
      <div className="border border-[#e7d6bf] bg-white px-4 py-3">
        <div className="text-xl font-semibold text-[#2c2e4b]">{loading ? '–' : stats.withAllergies}</div>
        <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#2c2e4b]/60">With allergies</div>
      </div>
      <div className="border border-[#e7d6bf] bg-white px-4 py-3">
        <div className="text-xl font-semibold text-[#2c2e4b]">{loading ? '–' : stats.withConditions}</div>
        <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#2c2e4b]/60">Medical conditions</div>
      </div>
    </div>
  );
}
