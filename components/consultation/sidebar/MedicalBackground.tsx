'use client';

interface MedicalBackgroundProps {
  conditions?: string | null;
  history?: string | null;
}

export function MedicalBackground({ conditions, history }: MedicalBackgroundProps) {
  return (
    <div className="space-y-3">
      {conditions && (
        <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Conditions</p>
          <p className="text-xs text-slate-700 leading-relaxed">{conditions}</p>
        </div>
      )}
      {history && (
        <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">History</p>
          <p className="text-xs text-slate-600 leading-relaxed line-clamp-4">{history}</p>
        </div>
      )}
    </div>
  );
}
