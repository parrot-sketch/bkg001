'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Package, ChevronRight, Clock, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SurgicalCase {
    id: string;
    status: string;
    procedure_name: string | null;
    patient: {
        first_name: string;
        last_name: string;
        file_number: string | null;
    };
    primary_surgeon: {
        name: string;
    };
    created_at: string;
    team_members_count?: number;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; className?: string }> = {
    READY_FOR_SCHEDULING: { label: 'Pending Theater Prep', variant: 'outline', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    READY_FOR_THEATER_PREP: { label: 'Ready for Booking', variant: 'outline', className: 'bg-blue-50 text-blue-700 border-blue-200' },
};

export default function TheaterTechDashboard() {
    const router = useRouter();
    const { user, isAuthenticated } = useAuth();
    const [cases, setCases] = useState<SurgicalCase[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetched, setFetched] = useState(false);

    useEffect(() => {
        if (!isAuthenticated || fetched) return;

        const fetchCases = async () => {
            try {
                const res = await fetch('/api/theater-tech/surgical-cases');
                const data = await res.json();
                if (data.success) {
                    setCases(data.data || []);
                }
            } catch (error) {
                console.error('Error fetching cases:', error);
            } finally {
                setLoading(false);
                setFetched(true);
            }
        };

        fetchCases();
    }, [isAuthenticated, fetched]);

    const handleCaseClick = (caseId: string, status: string) => {
        // If case needs planning (DRAFT/PLANNING), go to plan page
        // Otherwise go to theater prep
        if (status === 'DRAFT' || status === 'PLANNING') {
            router.push(`/theater-tech/surgical-cases/${caseId}/plan`);
        } else {
            router.push(`/theater-tech/dashboard/${caseId}`);
        }
    };

    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-10 w-64" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-32" />
                    ))}
                </div>
            </div>
        );
    }

    const pendingCases = cases.filter(c => c.status === 'READY_FOR_SCHEDULING');
    const readyCases = cases.filter(c => c.status === 'READY_FOR_THEATER_PREP');

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Theater Tech Dashboard</h1>
                <p className="text-slate-500">Manage surgical team and prepare cases for theater</p>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Pending Prep</CardTitle>
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingCases.length}</div>
                        <p className="text-xs text-muted-foreground">Cases awaiting team & items</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Ready for Booking</CardTitle>
                        <Clock className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{readyCases.length}</div>
                        <p className="text-xs text-muted-foreground">Awaiting theater scheduling</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Cases</CardTitle>
                        <Users className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{cases.length}</div>
                        <p className="text-xs text-muted-foreground">Active surgical cases</p>
                    </CardContent>
                </Card>
            </div>

            {/* Cases List */}
            <Card>
                <CardHeader>
                    <CardTitle>Surgical Cases</CardTitle>
                </CardHeader>
                <CardContent>
                    {cases.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            No surgical cases requiring theater prep
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {cases.map((surgicalCase) => {
                                const statusConfig = STATUS_CONFIG[surgicalCase.status] || { label: surgicalCase.status, variant: 'secondary' };
                                return (
                                    <div
                                        key={surgicalCase.id}
                                        onClick={() => handleCaseClick(surgicalCase.id, surgicalCase.status)}
                                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <span className="font-medium">
                                                    {surgicalCase.patient.first_name} {surgicalCase.patient.last_name}
                                                </span>
                                                {surgicalCase.patient.file_number && (
                                                    <span className="text-xs text-slate-400">#{surgicalCase.patient.file_number}</span>
                                                )}
                                                <Badge variant={statusConfig.variant} className={statusConfig.className}>
                                                    {statusConfig.label}
                                                </Badge>
                                            </div>
                                            <div className="text-sm text-slate-500 mt-1">
                                                {surgicalCase.procedure_name || 'No procedure specified'} • Dr. {surgicalCase.primary_surgeon.name}
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-slate-400" />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
