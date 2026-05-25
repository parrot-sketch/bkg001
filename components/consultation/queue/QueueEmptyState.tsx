'use client';

export function QueueEmptyState() {
  return (
    <div className="py-12 px-6 text-center">
      <p className="text-sm font-semibold text-slate-900">Queue clear</p>
      <p className="text-xs text-slate-500 mt-1">No patients waiting.</p>
    </div>
  );
}
