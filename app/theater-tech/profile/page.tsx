'use client';

/**
 * Theater Tech Profile Page (placeholder)
 *
 * Minimal profile page for the Theater Technician role.
 * Can be expanded later with personal details, notification preferences, etc.
 */

import { User } from 'lucide-react';

export default function TheaterTechProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">My Profile</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Theater Technician account settings
        </p>
      </div>

      <div className="flex flex-col items-center justify-center h-64 text-center">
        <User className="h-12 w-12 text-slate-300 mb-3" />
        <p className="text-sm text-muted-foreground">
          Profile management coming soon.
        </p>
      </div>
    </div>
  );
}
