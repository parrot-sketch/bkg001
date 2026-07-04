'use client';

export function QueueEmptyState() {
  return (
    <div className="py-12 px-6 text-center">
      <p className="text-sm font-semibold text-[#2c2e4b]">Queue clear</p>
      <p className="text-xs text-[#2c2e4b]/60 mt-1">No patients waiting.</p>
    </div>
  );
}
