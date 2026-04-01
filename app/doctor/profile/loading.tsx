/**
 * Loading skeleton for Doctor Profile page.
 *
 * Matches the actual layout: identity card, slot settings, professional info.
 */

export default function DoctorProfileLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
      {/* Identity Card Skeleton */}
      <div className="border border-stone-200 rounded-lg bg-white p-5">
        <div className="flex gap-5">
          <div className="w-16 h-16 rounded-full bg-stone-100 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-48 bg-stone-100 rounded" />
            <div className="h-4 w-24 bg-stone-100 rounded" />
            <div className="flex gap-3 mt-2">
              <div className="h-3 w-32 bg-stone-100 rounded" />
              <div className="h-3 w-24 bg-stone-100 rounded" />
            </div>
            <div className="flex gap-3 mt-1">
              <div className="h-3 w-20 bg-stone-100 rounded" />
              <div className="h-3 w-16 bg-stone-100 rounded" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-20 bg-stone-100 rounded" />
            <div className="h-8 w-16 bg-stone-100 rounded" />
          </div>
        </div>
      </div>

      {/* Slot Settings Skeleton */}
      <div className="border border-stone-200 rounded-lg bg-white p-5">
        <div className="h-4 w-32 bg-stone-100 rounded mb-4" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="border border-stone-100 rounded-lg p-3 text-center space-y-2">
              <div className="h-4 w-4 bg-stone-100 rounded mx-auto" />
              <div className="h-6 w-12 bg-stone-100 rounded mx-auto" />
              <div className="h-3 w-16 bg-stone-100 rounded mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Professional Info Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="border border-stone-200 rounded-lg bg-white p-5 space-y-3">
            <div className="h-4 w-28 bg-stone-100 rounded" />
            <div className="space-y-2">
              <div className="h-3 w-full bg-stone-100 rounded" />
              <div className="h-3 w-5/6 bg-stone-100 rounded" />
              <div className="h-3 w-4/6 bg-stone-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
