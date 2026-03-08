'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Clock, DollarSign, Receipt, CheckCircle } from 'lucide-react';

interface BillingSummaryProps {
  summary?: {
    pendingCount: number;
    totalCollected: number;
    totalBilled: number;
    paidCount: number;
  };
}

export function BillingSummary({ summary }: BillingSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Bills</p>
              <p className="text-2xl font-bold">{summary?.pendingCount || 0}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Collected Today</p>
              <p className="text-2xl font-bold">
                {(summary?.totalCollected || 0).toLocaleString()}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Billed Today</p>
              <p className="text-2xl font-bold">
                {(summary?.totalBilled || 0).toLocaleString()}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Receipt className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Paid Today</p>
              <p className="text-2xl font-bold">{summary?.paidCount || 0}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
