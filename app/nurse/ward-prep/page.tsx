'use client';

/**
 * Nurse Pre-Op Cases Dashboard
 *
 * View and manage surgical cases pending pre-operative readiness work.
 * Refactored to use standard Nurse UI components and table layout.
 */

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { usePreOpCases } from '@/hooks/nurse/usePreOpCases';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Activity,
  Search,
  CheckCircle2,
  Clock,
  ClipboardList,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from 'next/link';

import { NursePageHeader } from '@/components/nurse/NursePageHeader';
import { NurseStatCard } from '@/components/nurse/NurseStatCard';
import { WardPrepTableRow } from '@/components/nurse/WardPrepTableRow';

export default function PreOpCasesPage() {
  const { user, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [readinessFilter, setReadinessFilter] = useState<'all' | 'ready' | 'pending'>('all');

  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = usePreOpCases(
    readinessFilter === 'all' ? undefined : { readiness: readinessFilter }
  );

  // Filter cases by search query
  const filteredCases = useMemo(() => {
    if (!data?.cases) return [];
    if (!searchQuery.trim()) return data.cases;

    const query = searchQuery.toLowerCase();
    return data.cases.filter(
      (c) =>
        c.patient?.fullName?.toLowerCase().includes(query) ||
        c.patient?.fileNumber?.toLowerCase().includes(query) ||
        c.procedureName?.toLowerCase().includes(query) ||
        c.primarySurgeon?.name?.toLowerCase().includes(query)
    );
  }, [data?.cases, searchQuery]);

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to view pre-op cases</p>
          <Link href="/login">
            <Button className="mt-4">Go to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 pb-10">

      <NursePageHeader />

      <div className="space-y-6">

        {/* Stats Grid */}
        {data?.summary && (
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <NurseStatCard
              title="Total Cases"
              value={data.summary.total}
              subtitle="Active in Ward Prep"
              icon={Activity}
              color="slate"
              loading={isLoading}
            />
            <NurseStatCard
              title="Ready for Scheduling"
              value={data.summary.ready}
              subtitle="All checks passed"
              icon={CheckCircle2}
              color="emerald"
              loading={isLoading}
              pulse={data.summary.ready > 0}
            />
            <NurseStatCard
              title="Action Required"
              value={data.summary.pending}
              subtitle="Missing Items"
              icon={Clock}
              color="amber"
              loading={isLoading}
            />
            <NurseStatCard
              title="Planning Phase"
              value={data.summary.byStatus.planning}
              subtitle="Initial Workup"
              icon={ClipboardList}
              color="blue"
              loading={isLoading}
            />
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Active Cases</h2>
            <p className="text-sm text-slate-500">Manage patient readiness checklists</p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search cases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>
            <Select
              value={readinessFilter}
              onValueChange={(v) => setReadinessFilter(v as 'all' | 'ready' | 'pending')}
            >
              <SelectTrigger className="w-[160px] bg-white">
                <SelectValue placeholder="Filter..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cases</SelectItem>
                <SelectItem value="ready">Ready Only</SelectItem>
                <SelectItem value="pending">Pending Only</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isRefetching} className="bg-white">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Table View */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-slate-50 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
              <h3 className="text-slate-900 font-medium">Failed to load cases</h3>
              <p className="text-slate-500 text-sm mb-4">{(error as Error).message}</p>
              <Button onClick={() => refetch()}>Try Again</Button>
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="text-center py-20 bg-slate-50/50">
              <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-slate-900 font-medium mb-1">No cases found</h3>
              <p className="text-sm text-slate-500">
                {searchQuery ? `No results for "${searchQuery}"` : 'Active ward prep list is clear.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead className="w-[250px]">Patient & Procedure</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Surgeon & Info</TableHead>
                  <TableHead className="w-[180px]">Checklist Progress</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.map((surgicalCase) => (
                  <WardPrepTableRow key={surgicalCase.id} surgicalCase={surgicalCase} />
                ))}
              </TableBody>
            </Table>
          )}
        </div>

      </div>
    </div>
  );
}
