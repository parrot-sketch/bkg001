/**
 * Loading skeleton for Doctor Profile page.
 * 
 * Displayed instantly by Next.js while the async Server Component
 * fetches data. Prevents the "frozen page / click multiple times" problem.
 */

export default function DoctorProfileLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Hero Banner Skeleton */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-slate-200 to-slate-300 h-56" />

      {/* Identity Row */}
      <div className="flex items-center gap-4 px-2">
        <div className="h-20 w-20 rounded-full bg-slate-200 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-6 w-48 bg-slate-200 rounded" />
          <div className="h-4 w-32 bg-slate-200 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 bg-slate-200 rounded-lg" />
          <div className="h-9 w-24 bg-slate-200 rounded-lg" />
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column — Professional Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bio Card */}
          <div className="rounded-xl border bg-card p-6 space-y-3">
            <div className="h-5 w-28 bg-slate-200 rounded" />
            <div className="h-4 w-full bg-slate-100 rounded" />
            <div className="h-4 w-5/6 bg-slate-100 rounded" />
            <div className="h-4 w-4/6 bg-slate-100 rounded" />
          </div>

          {/* Credentials Card */}
          <div className="rounded-xl border bg-card p-6 space-y-3">
            <div className="h-5 w-36 bg-slate-200 rounded" />
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-24 bg-slate-100 rounded" />
                  <div className="h-4 w-32 bg-slate-200 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column — Schedule & Stats */}
        <div className="space-y-6">
          {/* Schedule Card */}
          <div className="rounded-xl border bg-card p-6 space-y-3">
            <div className="h-5 w-32 bg-slate-200 rounded" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-4 w-12 bg-slate-100 rounded" />
                <div className="h-4 flex-1 bg-slate-100 rounded" />
              </div>
            ))}
          </div>

          {/* Activity Card */}
          <div className="rounded-xl border bg-card p-6 space-y-3">
            <div className="h-5 w-28 bg-slate-200 rounded" />
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-slate-100 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
