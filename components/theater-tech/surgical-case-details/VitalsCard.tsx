'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Plus } from 'lucide-react';
import { format } from 'date-fns';

interface VitalsCardProps {
  vitals: any[];
  onRecordVitals: () => void;
}

export function VitalsCard({ vitals, onRecordVitals }: VitalsCardProps) {
  return (
    <Card className="bg-white/95">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-[#2c2e4b] flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#caa26a]" />
            Pre-Op Vitals
          </CardTitle>
          <Button size="sm" onClick={onRecordVitals} className="bg-[#caa26a] hover:bg-[#b8913e] text-white font-bold shadow-sm">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Record Vitals
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {vitals.length === 0 ? (
          <p className="text-sm text-slate-500">No vitals recorded yet. Click "Record Vitals" to add the first set.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 text-xs font-semibold text-slate-500">Recorded</th>
                  <th className="text-left py-2 text-xs font-semibold text-slate-500">Temp</th>
                  <th className="text-left py-2 text-xs font-semibold text-slate-500">BP</th>
                  <th className="text-left py-2 text-xs font-semibold text-slate-500">Pulse</th>
                  <th className="text-left py-2 text-xs font-semibold text-slate-500">SpO2</th>
                  <th className="text-left py-2 text-xs font-semibold text-slate-500">Weight</th>
                  <th className="text-left py-2 text-xs font-semibold text-slate-500">Height</th>
                  <th className="text-left py-2 text-xs font-semibold text-slate-500">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vitals.map((v) => (
                  <tr key={v.id}>
                    <td className="py-3 text-slate-600 whitespace-nowrap">
                      {format(new Date(v.recorded_at), 'dd MMM yyyy HH:mm')}
                    </td>
                    <td className="py-3 text-slate-900 font-medium">
                      {v.body_temperature != null ? `${v.body_temperature}°C` : '—'}
                    </td>
                    <td className="py-3 text-slate-700">
                      {v.systolic != null && v.diastolic != null ? `${v.systolic}/${v.diastolic}` : '—'}
                    </td>
                    <td className="py-3 text-slate-700">
                      {v.heart_rate ?? '—'}
                    </td>
                    <td className="py-3 text-slate-700">
                      {v.oxygen_saturation != null ? `${v.oxygen_saturation}%` : '—'}
                    </td>
                    <td className="py-3 text-slate-700">
                      {v.weight != null ? `${v.weight} kg` : '—'}
                    </td>
                    <td className="py-3 text-slate-700">
                      {v.height != null ? `${v.height} cm` : '—'}
                    </td>
                    <td className="py-3 text-slate-500 text-xs">
                      {v.recorded_by_name || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
