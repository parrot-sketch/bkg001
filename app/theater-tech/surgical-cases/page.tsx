'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
    Scissors,
    Search,
    Calendar,
    User,
    Clock,
    Eye,
    Plus,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { initiateSurgicalCase } from '@/actions/doctor/consultation-hub';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; textColor: string }> = {
    DRAFT: { label: 'Draft', color: 'bg-slate-100 text-slate-700', bg: 'bg-slate-100', textColor: 'text-slate-700' },
    PLANNING: { label: 'Planning', color: 'bg-blue-100 text-blue-700', bg: 'bg-blue-100', textColor: 'text-blue-700' },
    READY_FOR_WARD_PREP: { label: 'Ward Prep', color: 'bg-cyan-100 text-cyan-700', bg: 'bg-cyan-100', textColor: 'text-cyan-700' },
    IN_WARD_PREP: { label: 'In Ward Prep', color: 'bg-teal-100 text-teal-700', bg: 'bg-teal-100', textColor: 'text-teal-700' },
    READY_FOR_THEATER_BOOKING: { label: 'Ready for Booking', color: 'bg-indigo-100 text-indigo-700', bg: 'bg-indigo-100', textColor: 'text-indigo-700' },
    READY_FOR_THEATER_PREP: { label: 'Ready for Prep', color: 'bg-violet-100 text-violet-700', bg: 'bg-violet-100', textColor: 'text-violet-700' },
    SCHEDULED: { label: 'Scheduled', color: 'bg-purple-100 text-purple-700', bg: 'bg-purple-100', textColor: 'text-purple-700' },
    IN_PREP: { label: 'In Prep', color: 'bg-amber-100 text-amber-700', bg: 'bg-amber-100', textColor: 'text-amber-700' },
    IN_THEATER: { label: 'In Theater', color: 'bg-red-100 text-red-700', bg: 'bg-red-100', textColor: 'text-red-700' },
    RECOVERY: { label: 'Recovery', color: 'bg-emerald-100 text-emerald-700', bg: 'bg-emerald-100', textColor: 'text-emerald-700' },
    COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700', bg: 'bg-green-100', textColor: 'text-green-700' },
    CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500', bg: 'bg-gray-100', textColor: 'text-gray-500' },
};

const STATUS_TABS = [
    { value: '', label: 'All' },
    { value: 'DRAFT,PLANNING', label: 'Planning' },
    { value: 'READY_FOR_WARD_PREP,IN_WARD_PREP,READY_FOR_THEATER_BOOKING,READY_FOR_THEATER_PREP', label: 'Prep' },
    { value: 'SCHEDULED,IN_PREP', label: 'Scheduled' },
    { value: 'IN_THEATER,RECOVERY', label: 'Active' },
    { value: 'COMPLETED,CANCELLED', label: 'Done' },
] as const;

interface SurgicalCaseItem {
    id: string;
    status: string;
    urgency: string;
    procedure_name: string | null;
    procedure_date: string | null;
    created_at: string;
    patient: {
        first_name: string;
        last_name: string;
        file_number: string | null;
    };
    primary_surgeon: {
        name: string;
    };
}

export default function TheaterTechSurgicalCasesPage() {
    const router = useRouter();
    const [cases, setCases] = useState<SurgicalCaseItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('');

    const fetchCases = useCallback(async () => {
        setLoading(true);
        try {
            const statusParam = activeTab ? `&status=${activeTab}` : '';
            const res = await fetch(`/api/theater-tech/surgical-cases/list?page=1${statusParam}`);
            const data = await res.json();
            if (data.success) {
                setCases(data.data || []);
            }
        } catch (error) {
            console.error('Error fetching cases:', error);
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        fetchCases();
    }, [fetchCases]);

    const filteredCases = cases.filter(c => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            c.patient.first_name.toLowerCase().includes(query) ||
            c.patient.last_name.toLowerCase().includes(query) ||
            c.patient.file_number?.toLowerCase().includes(query) ||
            c.procedure_name?.toLowerCase().includes(query)
        );
    });

    const handleViewPlan = (caseId: string, status: string) => {
        // Always route to theater tech's plan page
        router.push(`/theater-tech/surgical-cases/${caseId}/plan`);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Surgical Cases</h1>
                    <p className="text-xs text-slate-500">All surgical cases</p>
                </div>
            </div>

            {/* Status Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-2">
                {STATUS_TABS.map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => { setActiveTab(tab.value); }}
                        className={cn(
                            "px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap",
                            activeTab === tab.value
                                ? "bg-slate-900 text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Search patients or procedures..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Cases Table */}
            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-4 space-y-3">
                            {[1, 2, 3].map(i => (
                                <Skeleton key={i} className="h-16" />
                            ))}
                        </div>
                    ) : filteredCases.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            {searchQuery ? 'No cases match your search' : 'No surgical cases found'}
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b">
                                <tr>
                                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Patient</th>
                                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Surgeon</th>
                                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Procedure</th>
                                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Date</th>
                                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Status</th>
                                    <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredCases.map(surgicalCase => {
                                    const statusCfg = STATUS_CONFIG[surgicalCase.status] || { label: surgicalCase.status, color: 'bg-gray-100' };
                                    return (
                                        <tr key={surgicalCase.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-slate-400" />
                                                    <div>
                                                        <p className="text-sm font-medium">
                                                            {surgicalCase.patient.first_name} {surgicalCase.patient.last_name}
                                                        </p>
                                                        <p className="text-xs text-slate-400">
                                                            {surgicalCase.patient.file_number || '—'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-slate-600">
                                                    {surgicalCase.primary_surgeon.name}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-slate-600">
                                                    {surgicalCase.procedure_name || '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-slate-500">
                                                    {surgicalCase.procedure_date 
                                                        ? format(new Date(surgicalCase.procedure_date), 'MMM d, yyyy')
                                                        : '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge className={cn("text-xs", statusCfg.color)}>
                                                    {statusCfg.label}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm"
                                                        onClick={() => handleViewPlan(surgicalCase.id, surgicalCase.status)}
                                                    >
                                                        <Eye className="h-4 w-4 mr-1" />
                                                        {surgicalCase.status === 'DRAFT' || surgicalCase.status === 'PLANNING' ? 'Plan' : 'View'}
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}