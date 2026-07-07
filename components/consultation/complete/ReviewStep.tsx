'use client';

import { format } from 'date-fns';
import { Calendar, FileText, Clock, FileText as ChargeSheetIcon } from 'lucide-react';

interface ReviewStepProps {
  summary: string;
  followUp: {
    followUpDate?: Date;
    followUpTime?: string;
    followUpType?: string;
  };
  billingItems?: any[];
  billingTotal: number;
  discount: number;
}

export function ReviewStep({ summary, followUp, billingItems, billingTotal, discount }: ReviewStepProps) {
  const items = Array.isArray(billingItems) ? billingItems : [];
  const hasFollowUp = !!followUp.followUpDate;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-[#e7d6bf]/30 flex items-center justify-center border border-[#e7d6bf]">
          <svg className="h-4 w-4 text-[#caa26a]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[#2c2e4b]">Review & Finalize</h3>
          <p className="text-[10px] text-[#2c2e4b]/60">Confirm all details before completing</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="p-3 rounded-lg border border-[#e7d6bf] bg-white">
          <div className="flex items-center gap-2 mb-1.5">
            <FileText className="h-3.5 w-3.5 text-[#caa26a]" />
            <p className="text-[10px] font-semibold text-[#2c2e4b]/60 uppercase tracking-wider">Summary</p>
          </div>
          <p className="text-xs text-[#2c2e4b] line-clamp-3 whitespace-pre-wrap">{summary || 'No summary provided'}</p>
        </div>

        {hasFollowUp && (
          <div className="p-3 rounded-lg border border-[#e7d6bf] bg-white">
            <div className="flex items-center gap-2 mb-1.5">
              <Calendar className="h-3.5 w-3.5 text-[#caa26a]" />
              <p className="text-[10px] font-semibold text-[#2c2e4b]/60 uppercase tracking-wider">Follow-up</p>
            </div>
            <p className="text-xs text-[#2c2e4b]">
              {followUp.followUpType} • {followUp.followUpDate ? format(followUp.followUpDate, 'EEE, MMM d, yyyy') : ''} • {followUp.followUpTime}
            </p>
          </div>
        )}

        <div className="p-3 rounded-lg border border-[#e7d6bf] bg-white">
          <div className="flex items-center gap-2 mb-1.5">
            <ChargeSheetIcon className="h-3.5 w-3.5 text-[#caa26a]" />
            <p className="text-[10px] font-semibold text-[#2c2e4b]/60 uppercase tracking-wider">Charge Sheet</p>
          </div>
          {items.length > 0 ? (
            <div className="space-y-1">
              {items.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-[#2c2e4b]/70">{item.serviceName || 'Service'}</span>
                  <span className="font-medium text-[#2c2e4b]">KSH {(item.quantity * item.unitCost).toLocaleString()}</span>
                </div>
              ))}
              <div className="flex items-center justify-between text-xs pt-1.5 border-t border-[#e7d6bf]">
                <span className="text-[#2c2e4b]/60">Discount</span>
                <span className="text-[#2c2e4b]">- KSH {discount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-semibold pt-1 border-t border-[#e7d6bf]">
                <span className="text-[#2c2e4b]">Total</span>
                <span className="text-[#2c2e4b]">KSH {Math.max(0, billingTotal - discount).toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#2c2e4b]/50">Default consultation fee will be applied</p>
          )}
        </div>
      </div>
    </div>
  );
}
