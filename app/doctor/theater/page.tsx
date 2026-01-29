'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { doctorApi } from '@/lib/api/doctor';
import { ClinicalDashboardShell } from '@/components/layouts/ClinicalDashboardShell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Search, Filter, Calendar, AlertCircle } from 'lucide-react';
import { CaseReadinessStatus, getCaseReadinessStatusLabel } from '@/domain/enums/CaseReadinessStatus';
import Link from 'next/link';

interface TheaterCase {
    id: number;
    appointmentId: number;
    patientName: string;
    procedureName: string;
    date: Date;
    status: CaseReadinessStatus;
    surgeon: string;
}

export default function TheaterDashboardPage() {
    const { user } = useAuth();
    const [cases, setCases] = useState<TheaterCase[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | CaseReadinessStatus>('ALL');

    useEffect(() => {
        fetchTheaterSchedule();
    }, []);

    const fetchTheaterSchedule = async () => {
        try {
            setLoading(true);
            // Determine date range (next 7 days)
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 30); // Look ahead 30 days

            const response = await doctorApi.getTheatreSchedule(startDate, endDate);

            if (response.success && response.data) {
                // Map response to TheaterCase interface
                // This assumes the API returns a structure we can map. 
                // If the API isn't fully ready to return mapped data, we'll need to adjust.
                // For now, based on doctorApi.getTheatreSchedule, it returns any[]

                const mappedCases = response.data.map((item: any) => ({
                    id: item.casePlan?.id || 0, // Fallback if no case plan yet
                    appointmentId: item.id,
                    patientName: item.patient ? `${item.patient.firstName} ${item.patient.lastName}` : 'Unknown',
                    procedureName: item.casePlan?.procedure_plan || item.type || 'Unspecified Procedure',
                    date: new Date(item.appointmentDate),
                    status: (item.casePlan?.readiness_status as CaseReadinessStatus) || CaseReadinessStatus.NOT_STARTED,
                    surgeon: item.doctor ? `${item.doctor.firstName} ${item.doctor.lastName}` : 'Unknown', // This might need adjustment based on Doctor model
                }));

                setCases(mappedCases);
            } else {
                // If API fails or returns empty, just show empty state for now
                // toast.error('Failed to load theater schedule');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error fetching theater schedule');
        } finally {
            setLoading(false);
        }
    };

    const filteredCases = cases.filter(c => {
        const matchesSearch = c.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.procedureName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status: CaseReadinessStatus) => {
        switch (status) {
            case CaseReadinessStatus.READY: return 'bg-green-100 text-green-800 border-green-200';
            case CaseReadinessStatus.PENDING_CONSENT: return 'bg-amber-100 text-amber-800 border-amber-200';
            case CaseReadinessStatus.PENDING_LABS: return 'bg-blue-100 text-blue-800 border-blue-200';
            case CaseReadinessStatus.ON_HOLD: return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-slate-100 text-slate-800 border-slate-200';
        }
    };

    return (
        <ClinicalDashboardShell>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Theater Schedule</h1>
                        <p className="text-muted-foreground">Manage upcoming surgical cases and readiness.</p>
                    </div>
                    <div className="flex gap-2">
                        {/* Future: Add "Book Theater" button */}
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-lg border shadow-sm">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search patient or procedure..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                        <SelectTrigger className="w-full md:w-48">
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4" />
                                <SelectValue placeholder="All Statuses" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Statuses</SelectItem>
                            <SelectItem value={CaseReadinessStatus.READY}>Ready for Surgery</SelectItem>
                            <SelectItem value={CaseReadinessStatus.PENDING_CONSENT}>Pending Consent</SelectItem>
                            <SelectItem value={CaseReadinessStatus.PENDING_LABS}>Pending Labs</SelectItem>
                            <SelectItem value={CaseReadinessStatus.NOT_STARTED}>Planning Not Started</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Schedule Table */}
                <Card>
                    <CardHeader className="pb-0">
                        <CardTitle>Upcoming Procedures</CardTitle>
                        <CardDescription>Next 30 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date & Time</TableHead>
                                    <TableHead>Patient</TableHead>
                                    <TableHead>Procedure</TableHead>
                                    <TableHead>Surgeon</TableHead>
                                    <TableHead>Readiness</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8">
                                            <div className="flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredCases.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            No surgical cases found for the selected period.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredCases.map((c) => (
                                        <TableRow key={c.appointmentId}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{format(c.date, 'MMM d, yyyy')}</span>
                                                    <span className="text-xs text-muted-foreground">{format(c.date, 'HH:mm')}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">{c.patientName}</TableCell>
                                            <TableCell>{c.procedureName}</TableCell>
                                            <TableCell>{c.surgeon}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={getStatusColor(c.status)}>
                                                    {getCaseReadinessStatusLabel(c.status)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Link href={`/doctor/operative/plan/${c.appointmentId}/new`}>
                                                    <Button variant="ghost" size="sm">
                                                        Manage Plan
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </ClinicalDashboardShell>
    );
}
