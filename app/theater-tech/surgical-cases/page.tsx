'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
    Scissors,
    AlertCircle,
    Calendar,
    User,
    Clock,
    CheckCircle2,
    XCircle,
    Search,
    ChevronLeft,
    ChevronRight,
    FileText,
    Eye,
    Plus,
    Package,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { initiateSurgicalCase } from '@/actions/doctor/consultation-hub';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    DRAFT: { label: 'Draft', color: 'text-slate-700', bg: 'bg-slate-100' },
    PLANNING: { label: 'Planning', color: 'text-blue-700', bg: 'bg-blue-100' },
    READY_FOR_WARD_PREP: { label: 'Ward Prep', color: 'text-cyan-700', bg: 'bg-cyan-100' },
    IN_WARD_PREP: { label: 'In Ward Prep', color: 'text-teal-700', bg: 'bg-teal-100' },
    READY_FOR_THEATER_BOOKING: { label: 'Ready for Booking', color: 'text-indigo-700', bg: 'bg-indigo-100' },
    READY_FOR_THEATER_PREP: { label: 'Ready for Prep', color: 'text-violet-700', bg: 'bg-violet-100' },
    SCHEDULED: { label: 'Scheduled', color: 'text-purple-700', bg: 'bg-purple-100' },
    IN_PREP: { label: 'In Prep', color: 'text-amber-700', bg: 'bg-amber-100' },
    IN_THEATER: { label: 'In Theater', color: 'text-red-700', bg: 'bg-red-100' },
    RECOVERY: { label: 'Recovery', color: 'text-emerald-700', bg: 'bg-emerald-100' },
    COMPLETED: { label: 'Completed', color: 'text-green-700', bg: 'bg-green-100' },
    CANCELLED: { label: 'Cancelled', color: 'text-gray-500', bg: 'bg-gray-100' },
};

const URGENCY_CONFIG: Record<string, { label: string; className: string }> = {
    ELECTIVE: { label: 'Elective', className: 'text-slate-500' },
    URGENT: { label: 'Urgent', className: 'text-amber-600' },
    EMERGENCY: { label: 'Emergency', className: 'text-red-600' },
};

const STATUS_TABS = [
    { value: '', label: 'All' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'PLANNING,READY_FOR_WARD_PREP', label: 'Planning' },
    { value: 'IN_WARD_PREP,READY_FOR_THEATER_BOOKING,READY_FOR_THEATER_PREP', label: 'Prep' },
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
    diagnosis: string | null;
    created_at: string;
    updated_at: string;
    patient: {
        id: string;
        first_name: string;
        last_name: string;
        file_number: string | null;
    };
    primary_surgeon: {
        name: string;
    };
}

interface CompletedConsultation {
    id: number;
    patient: {
        id: string;
        first_name: string;
        last_name: string;
        file_number: string | null;
    };
    completed_at: string | null;
    appointment?: {
        type: string;
    };
}

export default function TheaterTechSurgicalCasesPage() {
    const router = useRouter();
    const [cases, setCases] = useState<SurgicalCaseItem[]>([]);
    const [consultations, setConsultations] = useState<CompletedConsultation[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [showNewCaseDialog, setShowNewCaseDialog] = useState(false);
    const [creatingCase, setCreatingCase] = useState(false);

    const pageSize = 20;

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [casesRes, consultationsRes] = await Promise.all([
                fetch(`/api/theater-tech/surgical-cases/list?status=${activeTab}&page=${page}&search=${encodeURIComponent(searchQuery)}`),
                fetch('/api/theater-tech/surgical-cases/consultations'),
            ]);
            
            const casesData = await casesRes.json();
            const consultationsData = await consultationsRes.json();
            
            if (casesData.success) {
                setCases(casesData.data || []);
            }
            if (consultationsData.success) {
                setConsultations(consultationsData.data || []);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }, [activeTab, page, searchQuery]);

    useState(() => {
        fetchData();
    });

    const filteredCases = useMemo(() => {
        if (!searchQuery) return cases;
        const query = searchQuery.toLowerCase();
        return cases.filter(c => 
            c.patient.first_name.toLowerCase().includes(query) ||
            c.patient.last_name.toLowerCase().includes(query) ||
            c.patient.file_number?.toLowerCase().includes(query) ||
            c.procedure_name?.toLowerCase().includes(query)
        );
    }, [cases, searchQuery]);

    const handleCreateCase = async (consultationId: number) => {
        setCreatingCase(true);
        try {
            const res = await initiateSurgicalCase({ consultationId }) as { success: boolean; surgicalCaseId?: string; error?: string };
            if (res.success && res.surgicalCaseId) {
                toast.success('Surgical case created');
                setShowNewCaseDialog(false);
                router.push(`/theater-tech/surgical-cases/${res.surgicalCaseId}/plan`);
            } else {
                toast.error(res.error || 'Failed to create case');
            }
        } catch (error) {
            toast.error('Failed to create case');
        } finally {
            setCreatingCase(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Surgical Cases</h1>
                    <p className="text-xs text-slate-500">Plan and manage surgical procedures</p>
                </div>
                <Dialog open={showNewCaseDialog} onOpenChange={setShowNewCaseDialog}>
                    <DialogTrigger asChild>
                        <Button className="bg-slate-900 hover:bg-slate-800">
                            <Plus className="h-4 w-4 mr-2" />
                            New Case
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Create Surgical Case</DialogTitle>
                            <DialogDescription>Select a completed consultation to plan</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3 py-4">
                            {consultations.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-8">
                                    No completed consultations available
                                </p>
                            ) : (
                                consultations.map(consultation => (
                                    <div
                                        key={consultation.id}
                                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 cursor-pointer"
                                        onClick={() => handleCreateCase(consultation.id)}
                                    >
                                        <div>
                                            <p className="text-sm font-medium">
                                                {consultation.patient.first_name} {consultation.patient.last_name}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {consultation.patient.file_number}
                                            </p>
                                        </div>
                                        <Badge variant="outline" className="text-xs">
                                            {consultation.appointment?.type}
                                        </Badge>
                                    </div>
                                ))
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Status Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-2">
                {STATUS_TABS.map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => { setActiveTab(tab.value); setPage(1); }}
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

            {/* Cases List */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-20 rounded-xl" />
                    ))}
                </div>
            ) : filteredCases.length === 0 ? (
                <Card className="p-12 text-center">
                    <Scissors className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">No surgical cases found</p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {filteredCases.map(surgicalCase => (
                        <Card key={surgicalCase.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-sm font-semibold text-slate-900">
                                                {surgicalCase.patient.first_name} {surgicalCase.patient.last_name}
                                            </h3>
                                            <Badge className={cn(STATUS_CONFIG[surgicalCase.status]?.bg, STATUS_CONFIG[surgicalCase.status]?.color)}>
                                                {STATUS_CONFIG[surgicalCase.status]?.label}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-slate-500 mb-2">
                                            {surgicalCase.patient.file_number}
                                        </p>
                                        <div className="flex items-center gap-4 text-xs text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                {surgicalCase.primary_surgeon.name}
                                            </span>
                                            {surgicalCase.procedure_name && (
                                                <span className="flex items-center gap-1">
                                                    <Scissors className="h-3 w-3" />
                                                    {surgicalCase.procedure_name}
                                                </span>
                                            )}
                                            {surgicalCase.procedure_date && (
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {format(new Date(surgicalCase.procedure_date), 'MMM d, yyyy')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => router.push(`/theater-tech/surgical-cases/${surgicalCase.id}`)}
                                        >
                                            <Eye className="h-4 w-4 mr-1" />
                                            View
                                        </Button>
                                        {surgicalCase.status === 'DRAFT' || surgicalCase.status === 'PLANNING' ? (
                                            <Button
                                                size="sm"
                                                onClick={() => router.push(`/theater-tech/surgical-cases/${surgicalCase.id}/plan`)}
                                            >
                                                <Scissors className="h-4 w-4 mr-1" />
                                                Plan
                                            </Button>
                                        ) : null}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}