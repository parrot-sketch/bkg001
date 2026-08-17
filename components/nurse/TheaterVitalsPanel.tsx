'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import { format } from 'date-fns';

interface VitalSign {
  id: number;
  body_temperature?: number | null;
  systolic?: number | null;
  diastolic?: number | null;
  heart_rate?: string | null;
  respiratory_rate?: number | null;
  oxygen_saturation?: number | null;
  weight?: number | null;
  height?: number | null;
  recorded_by_name?: string;
  recorded_at: string;
}

interface TheaterVitalsPanelProps {
  vitals: VitalSign[];
}

export function TheaterVitalsPanel({ vitals }: TheaterVitalsPanelProps) {
  if (!vitals || vitals.length === 0) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b bg-slate-50/50">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Pre-Op Vitals
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-sm text-slate-500">No vitals recorded by theater tech yet.</p>
        </CardContent>
      </Card>
    );
  }

  const latest = vitals[0];

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3 border-b bg-slate-50/50">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-red-500" />
          Pre-Op Vitals
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          {latest.body_temperature != null && (
            <div className="space-y-1">
              <p className="text-xs text-slate-500">Temperature</p>
              <p className="text-sm font-semibold text-slate-900">{latest.body_temperature}°C</p>
            </div>
          )}
          {latest.systolic != null && latest.diastolic != null && (
            <div className="space-y-1">
              <p className="text-xs text-slate-500">Blood Pressure</p>
              <p className="text-sm font-semibold text-slate-900">{latest.systolic}/{latest.diastolic} mmHg</p>
            </div>
          )}
          {latest.heart_rate && (
            <div className="space-y-1">
              <p className="text-xs text-slate-500">Heart Rate</p>
              <p className="text-sm font-semibold text-slate-900">{latest.heart_rate} bpm</p>
            </div>
          )}
          {latest.respiratory_rate != null && (
            <div className="space-y-1">
              <p className="text-xs text-slate-500">Respiratory Rate</p>
              <p className="text-sm font-semibold text-slate-900">{latest.respiratory_rate}/min</p>
            </div>
          )}
          {latest.oxygen_saturation != null && (
            <div className="space-y-1">
              <p className="text-xs text-slate-500">SpO2</p>
              <p className="text-sm font-semibold text-slate-900">{latest.oxygen_saturation}%</p>
            </div>
          )}
          {latest.weight != null && (
            <div className="space-y-1">
              <p className="text-xs text-slate-500">Weight</p>
              <p className="text-sm font-semibold text-slate-900">{latest.weight} kg</p>
            </div>
          )}
          {latest.height != null && (
            <div className="space-y-1">
              <p className="text-xs text-slate-500">Height</p>
              <p className="text-sm font-semibold text-slate-900">{latest.height} cm</p>
            </div>
          )}
        </div>

        {vitals.length > 1 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">History</p>
            <div className="space-y-2">
              {vitals.slice(1).map((v) => (
                <div key={v.id} className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-2">
                  <span>{format(new Date(v.recorded_at), 'dd MMM yyyy HH:mm')}</span>
                  <span>
                    {v.body_temperature != null && `${v.body_temperature}°C`}
                    {v.systolic != null && v.diastolic != null && ` • ${v.systolic}/${v.diastolic}`}
                    {v.heart_rate && ` • ${v.heart_rate}bpm`}
                  </span>
                  <span className="text-slate-400">{v.recorded_by_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-slate-400 mt-3">
          Recorded by {latest.recorded_by_name || 'Unknown'} on {format(new Date(latest.recorded_at), 'dd MMM yyyy HH:mm')}
        </p>
      </CardContent>
    </Card>
  );
}
