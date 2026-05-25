'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Clock, DollarSign, Receipt, CheckCircle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BillingSummaryProps {
  summary?: {
    pendingCount: number;
    totalCollected: number;
    totalBilled: number;
    paidCount: number;
  };
}

export function BillingSummary({ summary }: BillingSummaryProps) {
  const collectionRate = summary?.totalBilled 
    ? Math.round((summary.totalCollected / summary.totalBilled) * 100) 
    : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="border-slate-200/60 bg-white shadow-sm">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Pending Bills
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {summary?.pendingCount || 0}
              </p>
            </div>
            <div className={cn(
              "h-11 w-11 rounded-xl flex items-center justify-center",
              "bg-slate-50 border border-slate-200"
            )}>
              <Clock className="h-5 w-5 text-slate-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200/60 bg-white shadow-sm">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Collected Today
              </p>
              <p className="text-2xl font-bold text-slate-900">
                KES {(summary?.totalCollected || 0).toLocaleString()}
              </p>
            </div>
            <div className={cn(
              "h-11 w-11 rounded-xl flex items-center justify-center",
              "bg-slate-50 border border-slate-200"
            )}>
              <DollarSign className="h-5 w-5 text-slate-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200/60 bg-white shadow-sm">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Billed Today
              </p>
              <p className="text-2xl font-bold text-slate-900">
                KES {(summary?.totalBilled || 0).toLocaleString()}
              </p>
            </div>
            <div className={cn(
              "h-11 w-11 rounded-xl flex items-center justify-center",
              "bg-slate-50 border border-slate-200"
            )}>
              <Receipt className="h-5 w-5 text-slate-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200/60 bg-white shadow-sm">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Collection Rate
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {collectionRate}%
              </p>
            </div>
            <div className={cn(
              "h-11 w-11 rounded-xl flex items-center justify-center",
              "bg-slate-50 border border-slate-200"
            )}>
              <TrendingUp className="h-5 w-5 text-slate-500" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
