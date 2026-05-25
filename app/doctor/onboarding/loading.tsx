'use client';

/**
 * Onboarding Loading Skeleton
 */
export default function OnboardingLoading() {
  return (
    <div className="min-h-screen bg-stone-50/50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-3xl">
        {/* Step Indicator Skeletons */}
        <div className="flex justify-between items-center px-4 mb-8">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className="flex flex-col items-center flex-1 relative">
              <div className="w-8 h-8 rounded-full bg-stone-200 animate-pulse flex items-center justify-center text-xs font-semibold text-stone-400" />
              <div className="h-2 w-16 bg-stone-200 animate-pulse rounded mt-2 hidden sm:block" />
            </div>
          ))}
        </div>

        {/* Card Skeleton */}
        <div className="bg-white py-8 px-4 border border-stone-200/80 shadow-sm sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="h-6 w-1/3 bg-stone-200 animate-pulse rounded" />
              <div className="h-4 w-2/3 bg-stone-100 animate-pulse rounded" />
            </div>
            
            <hr className="border-stone-100" />

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="h-4 w-20 bg-stone-200 animate-pulse rounded" />
                <div className="h-10 w-full bg-stone-100 animate-pulse rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-28 bg-stone-200 animate-pulse rounded" />
                <div className="h-10 w-full bg-stone-100 animate-pulse rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-32 bg-stone-200 animate-pulse rounded" />
                <div className="h-10 w-full bg-stone-100 animate-pulse rounded" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <div className="h-10 w-24 bg-stone-200 animate-pulse rounded" />
              <div className="h-10 w-28 bg-stone-200 animate-pulse rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
