/**
 * Loading skeleton for Doctor Profile — matches clinical board layout.
 */

export default function DoctorProfileLoading() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse space-y-5">
      <div className="space-y-2 border-b border-white/10 pb-4">
        <div className="h-7 w-48 bg-white/10" />
        <div className="h-4 w-80 max-w-full bg-white/5" />
      </div>

      <div className="border border-[#e7d6bf]/40 bg-white/95">
        <div className="border-b border-[#e7d6bf]/50 px-5 py-3.5">
          <div className="h-4 w-40 bg-[#e7d6bf]/50" />
        </div>
        <div className="flex gap-5 px-5 py-5">
          <div className="h-20 w-20 shrink-0 bg-[#e7d6bf]/40" />
          <div className="flex-1 space-y-3">
            <div className="h-5 w-56 bg-[#e7d6bf]/50" />
            <div className="h-4 w-36 bg-[#e7d6bf]/40" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-4 bg-[#e7d6bf]/35" />
              <div className="h-4 bg-[#e7d6bf]/35" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="border border-[#e7d6bf]/40 bg-white/95">
            <div className="border-b border-[#e7d6bf]/50 px-5 py-3.5">
              <div className="h-4 w-32 bg-[#e7d6bf]/50" />
            </div>
            <div className="space-y-2 px-5 py-5">
              <div className="h-10 bg-[#e7d6bf]/35" />
              <div className="h-10 bg-[#e7d6bf]/30" />
              <div className="h-10 bg-[#e7d6bf]/25" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
