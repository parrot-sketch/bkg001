'use client';

/**
 * Nurse Intra-Op queue — Nursing Operation Record worklist
 */

import { useAuth } from '@/hooks/patient/useAuth';
import { useIntraOpCases } from '@/hooks/nurse/useIntraOpCases';
import { Button } from '@/components/ui/button';
import { Activity, RefreshCw, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TheatreSupportTableRow } from '@/components/nurse/TheatreSupportTableRow';
import { NursePageHeader } from '@/components/nurse/NursePageHeader';

export default function NurseIntraOpQueuePage() {
  const { user, isAuthenticated } = useAuth();
  const { data, isLoading, error, refetch, isRefetching } = useIntraOpCases();

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <p className="text-white/70">Please log in to view the Intra-Op queue</p>
          <Link href="/login">
            <Button className="mt-4">Go to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 pb-10 space-y-6">
      <NursePageHeader
        title="Intra-Op"
        description="Nursing Operation Record"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="bg-white/90 hover:bg-white text-[#2c2e4b] border-[#e7d6bf]"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      <div className="bg-white/95 backdrop-blur rounded-xl border border-[#e7d6bf] shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-50 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
            <h3 className="text-slate-900 font-medium">Failed to load Intra-Op queue</h3>
            <p className="text-slate-500 text-sm mb-4">{(error as Error).message}</p>
            <Button onClick={() => refetch()}>Try Again</Button>
          </div>
        ) : data?.cases.length === 0 ? (
          <div className="text-center py-20 bg-slate-50/50">
            <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Activity className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-slate-900 font-medium mb-1">No Intra-Op cases</h3>
            <p className="text-sm text-slate-500">Cases appear here after ward prep is complete.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Procedure</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Surgeon</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.cases.map((c) => (
                <TheatreSupportTableRow key={c.id} surgicalCase={c} />
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
