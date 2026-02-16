'use client';

/**
 * Nurse Recovery & Discharge Queue
 *
 * View and manage surgical cases in recovery / PACU.
 * Refactored to use standard Nurse UI components and table layout.
 */

import { useAuth } from '@/hooks/patient/useAuth';
import { useRecoveryCases } from '@/hooks/nurse/useRecoveryCases';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HeartPulse, RefreshCw, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import {
    Table,
    TableBody,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import { NursePageHeader } from '@/components/nurse/NursePageHeader';
import { RecoveryCaseTableRow } from '@/components/nurse/RecoveryCaseTableRow';

export default function RecoveryDischargePage() {
    const { user, isAuthenticated } = useAuth();
    const { data, isLoading, error, refetch, isRefetching } = useRecoveryCases();

    if (!isAuthenticated || !user) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="text-center">
                    <p className="text-muted-foreground">Please log in to view recovery queue</p>
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
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold tracking-tight text-slate-900">Recovery & Discharge</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Manage patients in Post-Anesthesia Care Unit (PACU)
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching} className="bg-white">
                        <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>

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
                            <h3 className="text-slate-900 font-medium">Failed to load recovery queue</h3>
                            <p className="text-slate-500 text-sm mb-4">{(error as Error).message}</p>
                            <Button onClick={() => refetch()}>Try Again</Button>
                        </div>
                    ) : data?.cases.length === 0 ? (
                        <div className="text-center py-20 bg-slate-50/50">
                            <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                                <HeartPulse className="h-8 w-8 text-slate-400" />
                            </div>
                            <h3 className="text-slate-900 font-medium mb-1">No recovery cases</h3>
                            <p className="text-sm text-slate-500">
                                There are currently no patients in the recovery unit.
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-slate-50/80">
                                <TableRow>
                                    <TableHead className="w-[250px]">Patient & Procedure</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Surgeon</TableHead>
                                    <TableHead>Monitoring</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data?.cases.map((c) => (
                                    <RecoveryCaseTableRow key={c.id} surgicalCase={c} />
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </div>
        </div>
    );
}
