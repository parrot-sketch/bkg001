import { Loader2 } from 'lucide-react';

/**
 * Frontdesk Global Loading State
 * 
 * Adding this file solves the "rigid and manual" navigation feel in Next.js App Router.
 * Next.js will instantly render this component as a placeholder while the server fetches
 * data for the destination route, giving the user immediate visual feedback.
 */
export default function FrontdeskLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-transparent min-h-[60vh]">
      <div className="flex flex-col items-center gap-4 text-slate-400">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-600/70" />
        <p className="text-sm font-medium animate-pulse">Loading dashboard...</p>
      </div>
    </div>
  );
}
