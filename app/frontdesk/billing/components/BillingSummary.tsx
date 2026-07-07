'use client';

import { Card, CardContent } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BillingSummaryProps {
  summary?: {
    pendingCount: number;
    totalCollected: number;
    totalBilled: number;
    paidCount: number;
  };
  totalOutstanding?: number;
}

export function BillingSummary({ summary, totalOutstanding }: BillingSummaryProps) {
  const collectionRate = summary?.totalBilled
    ? Math.round((summary.totalCollected / summary.totalBilled) * 100)
    : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="border-[#e7d6bf] bg-white shadow-sm">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-[#2c2e4b]/60 uppercase tracking-wide">
                Total Outstanding
              </p>
              <p className="text-2xl font-bold text-[#2c2e4b]">
                KES {(totalOutstanding ?? 0).toLocaleString()}
              </p>
            </div>
            <div className={cn(
              "h-11 w-11 rounded-xl flex items-center justify-center",
              "bg-[#e7d6bf]/30 border border-[#e7d6bf]"
            )}>
              <DollarSign className="h-5 w-5 text-[#caa26a]" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#e7d6bf] bg-white shadow-sm">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-[#2c2e4b]/60 uppercase tracking-wide">
                Collected Today
              </p>
              <p className="text-2xl font-bold text-[#2c2e4b]">
                KES {(summary?.totalCollected || 0).toLocaleString()}
              </p>
            </div>
            <div className={cn(
              "h-11 w-11 rounded-xl flex items-center justify-center",
              "bg-[#e7d6bf]/30 border border-[#e7d6bf]"
            )}>
              <ReceiptIcon className="h-5 w-5 text-[#caa26a]" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#e7d6bf] bg-white shadow-sm">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-[#2c2e4b]/60 uppercase tracking-wide">
                Billed Today
              </p>
              <p className="text-2xl font-bold text-[#2c2e4b]">
                KES {(summary?.totalBilled || 0).toLocaleString()}
              </p>
            </div>
            <div className={cn(
              "h-11 w-11 rounded-xl flex items-center justify-center",
              "bg-[#e7d6bf]/30 border border-[#e7d6bf]"
            )}>
              <FileTextIcon className="h-5 w-5 text-[#caa26a]" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#e7d6bf] bg-white shadow-sm">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-[#2c2e4b]/60 uppercase tracking-wide">
                Collection Rate
              </p>
              <p className="text-2xl font-bold text-[#2c2e4b]">
                {collectionRate}%
              </p>
            </div>
            <div className={cn(
              "h-11 w-11 rounded-xl flex items-center justify-center",
              "bg-[#e7d6bf]/30 border border-[#e7d6bf]"
            )}>
              <TrendingUpIcon className="h-5 w-5 text-[#caa26a]" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReceiptIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}
function FileTextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}
function TrendingUpIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.5 4.5 7.5-7.5" /></svg>;
}
