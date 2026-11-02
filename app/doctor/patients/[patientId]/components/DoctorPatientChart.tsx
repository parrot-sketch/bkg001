'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, parseISO, subDays, startOfDay } from 'date-fns';
import { AppointmentStatus, canStartConsultation } from '@/domain/enums/AppointmentStatus';
import { cn } from '@/lib/utils';
import type { VisitResponseDto } from '@/application/dtos/VisitResponseDto';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Range = 'all' | '30d' | 'year';

function plain(value?: string | null) {
  if (!value) return '';
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function prettyStatus(status: string) {
  return status.toLowerCase().split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function statusClass(status: string) {
  if (status === 'CANCELLED' || status === 'NO_SHOW') return 'text-[#9b2226]';
  if (status === 'COMPLETED') return 'text-[#005f73]';
  if (status === 'IN_CONSULTATION') return 'text-[#b8913e]';
  return 'text-[#2c2e4b]';
}

function canOpenRoom(status: string) {
  return status === AppointmentStatus.IN_CONSULTATION || canStartConsultation(status as AppointmentStatus);
}

export function DoctorPatientChart({
  patientId,
  visits,
  isLoading,
  error,
  onRetry,
}: {
  patientId: string;
  visits: VisitResponseDto[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const router = useRouter();
  const [range, setRange] = useState<Range>('all');

  const filtered = useMemo(() => {
    const now = new Date();
    const from = range === '30d' ? startOfDay(subDays(now, 30)) : range === 'year' ? new Date(now.getFullYear(), 0, 1) : null;
    return [...visits]
      .filter((visit) => {
        if (!from) return true;
        const date = parseISO(visit.date);
        return !Number.isNaN(date.getTime()) && date >= from;
      })
      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [visits, range]);

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-[#e7d6bf] bg-[#e7d6bf]/30 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold text-[#2c2e4b]">Previous consultations</h2>
        <div className="flex items-center gap-1">
          {([
            ['all', 'All'],
            ['30d', '30 days'],
            ['year', 'This year'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setRange(key)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium',
                range === key ? 'bg-[#2c2e4b] text-white' : 'text-[#2c2e4b]/70 hover:bg-[#e7d6bf]/40',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="px-5 py-10 text-sm text-[#2c2e4b]/60">Loading consultations…</p>
      ) : error ? (
        <div className="px-5 py-10">
          <p className="text-sm text-[#2c2e4b]">{error}</p>
          <button type="button" onClick={onRetry} className="mt-2 text-sm font-medium text-[#005f73] hover:underline">
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-5 py-10">
          <p className="text-sm font-medium text-[#2c2e4b]">No visits in this period</p>
          <p className="mt-1 text-sm text-[#2c2e4b]/55">
            {visits.length ? 'Choose All to see every consultation.' : 'Consultations appear here after this patient is seen.'}
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-[#e7d6bf] hover:bg-transparent">
              {['Date', 'Time', 'Visit', 'Clinician', 'Complaint', 'Status', ''].map((column) => (
                <TableHead key={column || 'action'} className="h-9 bg-[#e7d6bf]/30 px-5 text-[11px] font-semibold uppercase tracking-wider text-[#005f73]">
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((visit) => {
              const complaint = plain(visit.consultation?.chiefComplaint);
              const visitHref = `/doctor/patients/${patientId}/visits/${visit.id}`;
              return (
                  <TableRow
                    key={visit.id}
                    className="cursor-pointer border-[#e7d6bf] hover:bg-[#e7d6bf]/30"
                    onClick={() => router.push(visitHref)}
                  >
                    <TableCell className="px-5 py-2.5 font-medium tabular-nums text-[#2c2e4b]">
                      {format(parseISO(visit.date), 'd MMM yyyy')}
                    </TableCell>
                    <TableCell className="px-5 py-2.5 tabular-nums text-[#2c2e4b]">{visit.time || '—'}</TableCell>
                    <TableCell className="px-5 py-2.5 text-[#2c2e4b]">{visit.type || 'Visit'}</TableCell>
                    <TableCell className="px-5 py-2.5 text-[#2c2e4b]">{visit.doctor?.name || '—'}</TableCell>
                    <TableCell className="max-w-[16rem] truncate px-5 py-2.5 text-[#2c2e4b]">{complaint || '—'}</TableCell>
                    <TableCell className={`px-5 py-2.5 text-sm font-medium ${statusClass(visit.status)}`}>
                      {prettyStatus(visit.status)}
                    </TableCell>
                    <TableCell className="px-5 py-2.5 text-right">
                      {canOpenRoom(visit.status) ? (
                        <Link
                          href={`/doctor/consultations/session/${visit.id}`}
                          onClick={(event) => event.stopPropagation()}
                          className="text-sm font-medium text-[#2c2e4b] hover:underline"
                        >
                          Consult
                        </Link>
                      ) : (
                        <span className="text-sm font-medium text-[#005f73]">Open</span>
                      )}
                    </TableCell>
                  </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
