'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ChevronLeft, Printer, Download } from 'lucide-react';

interface DocumentHeaderProps {
  recordId: number;
  appointmentDate: Date | string;
  time?: string;
  durationMinutes?: number;
  onPrint: () => void;
}

export function DocumentHeader({
  recordId,
  appointmentDate,
  time,
  durationMinutes,
  onPrint,
}: DocumentHeaderProps) {
  return (
    <>
      {/* Print-optimized header */}
      <div className="bg-white border-b border-[#e7d6bf] sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="h-9 px-2 text-[#2c2e4b]/70 hover:text-[#2c2e4b]">
              <Link href="/doctor/consultations">
                <ChevronLeft className="h-5 w-5 mr-1" />
                <span className="hidden sm:inline">Back to Hub</span>
              </Link>
            </Button>
            <div className="h-6 w-px bg-[#e7d6bf]" />
            <span className="text-sm font-medium text-[#2c2e4b]">Consultation Record</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 border-[#e7d6bf] text-[#2c2e4b]" onClick={onPrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" size="sm" className="h-9 border-[#e7d6bf] text-[#2c2e4b]">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Document Container */}
      <div className="max-w-4xl mx-auto p-6 sm:p-8 print:p-0">
        {/* Medical Document Header */}
        <div className="border-2 border-[#2c2e4b] mb-8">
          {/* Clinic Header */}
          <div className="bg-[#2c2e4b] text-white p-4 sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  NAIROBI SCULPT
                </h1>
                <p className="text-white/70 text-sm mt-1">
                  Aesthetic & Plastic Surgery Center
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/60">Document Type</p>
                <p className="font-semibold text-sm text-white">Consultation Record</p>
              </div>
            </div>
          </div>

          {/* Document Meta */}
          <div className="bg-[#e7d6bf]/40 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between text-sm border-b border-[#e7d6bf]">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-[#2c2e4b]/60">Reference No.</p>
                <p className="font-mono font-semibold text-[#2c2e4b]">CNS-{recordId.toString().padStart(6, '0')}</p>
              </div>
              <div>
                <p className="text-xs text-[#2c2e4b]/60">Date</p>
                <p className="font-semibold text-[#2c2e4b]">
                  {format(new Date(appointmentDate), 'MMMM d, yyyy')}
                </p>
              </div>
              {time && (
                <div>
                  <p className="text-xs text-[#2c2e4b]/60">Time</p>
                  <p className="font-semibold text-[#2c2e4b]">{time}</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                <CheckCircleIcon className="h-3 w-3 mr-1" />
                Completed
              </Badge>
              {durationMinutes && (
                <span className="text-[#2c2e4b]/70 text-sm">
                  {durationMinutes} min
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
