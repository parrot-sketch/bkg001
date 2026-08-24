'use client';

import { TheaterTechDashboardMetrics } from './TheaterTechDashboardMetrics';

export default function TheaterTechDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Theater Tech Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Patient registry and surgical case activity at a glance.
        </p>
      </div>

      <TheaterTechDashboardMetrics />
    </div>
  );
}
