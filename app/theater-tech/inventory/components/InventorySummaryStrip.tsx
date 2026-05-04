'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Package, AlertTriangle, Clock, XCircle, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface InventorySummaryStripProps {
  totalItems: number;
  lowStock: number;
  expiringSoon: number;
  outOfStock: number;
  pendingPo: number;
  isLoading?: boolean;
}

export function InventorySummaryStrip({
  totalItems,
  lowStock,
  expiringSoon,
  outOfStock,
  pendingPo,
  isLoading = false,
}: InventorySummaryStripProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const metrics = [
    { label: 'Total Items', value: totalItems, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Low Stock', value: lowStock, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Out of Stock', value: outOfStock, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Expiring Soon', value: expiringSoon, icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Pending POs', value: pendingPo, icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      {metrics.map((metric) => (
        <Card key={metric.label} className="border-slate-200 shadow-sm overflow-hidden">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <span className="text-sm font-medium text-slate-500">{metric.label}</span>
              <div className={`p-1.5 rounded-md ${metric.bg}`}>
                <metric.icon className={`w-4 h-4 ${metric.color}`} />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-semibold text-slate-900">{metric.value}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
