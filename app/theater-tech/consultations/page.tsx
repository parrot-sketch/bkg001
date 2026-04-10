'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
    ClipboardCheck,
    Search,
    Plus,
    Calendar,
    User,
    FileText,
    Scissors,
    Clock,
    Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { initiateSurgicalCase } from '@/actions/doctor/consultation-hub';

interface CompletedConsultation {
    id: number;
    completed_at: string | null;
    patient: {
        id: string;
        first_name: string;
        last_name: string;
        file_number: string | null;
    };
    appointment?: {
        type: string;
    };
    has_surgical_case?: boolean;
    surgical_case_id?: string;
}

export default function TheaterTechConsultationsPage() {
    const router = useRouter();
    const [consultations, setConsultations] = useState<CompletedConsultation[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [creatingCase, setCreatingCase] = useState<number | null>(null);

    useEffect(() => {
        const fetchConsultations = async () => {
            try {
                const res = await fetch('/api/theater-tech/surgical-cases/consultations');
                const data = await res.json();
                if (data.success) {
                    setConsultations(data.data || []);
                }
            } catch (error) {
                console.error('Error fetching consultations:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchConsultations();
    }, []);

    const filteredConsultations = consultations.filter(c => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            c.patient.first_name.toLowerCase().includes(query) ||
            c.patient.last_name.toLowerCase().includes(query) ||
            c.patient.file_number?.toLowerCase().includes(query)
        );
    });

    const handleCreateCase = async (consultationId: number) => {
        setCreatingCase(consultationId);
        try {
            const res = await initiateSurgicalCase({ consultationId }) as { 
                success: boolean; 
                surgicalCaseId?: string; 
                error?: string 
            };
            if (res.success && res.surgicalCaseId) {
                toast.success('Surgical case created');
                router.push(`/theater-tech/surgical-cases/${res.surgicalCaseId}/plan`);
            } else {
                toast.error(res.error || 'Failed to create case');
            }
        } catch (error) {
            toast.error('Failed to create case');
        } finally {
            setCreatingCase(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Consultation Hub</h1>
                    <p className="text-xs text-slate-500">Select completed consultations to plan surgery</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Search patient name or file number..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Consultations Table */}
            <Card>
                <CardHeader className="border-b">
                    <CardTitle className="text-base flex items-center gap-2">
                        <ClipboardCheck className="h-4 w-4" />
                        Completed Consultations
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-4 space-y-3">
                            {[1, 2, 3].map(i => (
                                <Skeleton key={i} className="h-16" />
                            ))}
                        </div>
                    ) : filteredConsultations.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            {searchQuery 
                                ? 'No consultations match your search' 
                                : 'No completed consultations available'}
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b">
                                <tr>
                                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Patient</th>
                                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">File #</th>
                                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Completed</th>
                                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Type</th>
                                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Status</th>
                                    <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredConsultations.map(consultation => (
                                    <tr key={consultation.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-slate-400" />
                                                <span className="font-medium text-sm">
                                                    {consultation.patient.first_name} {consultation.patient.last_name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm text-slate-500">
                                                {consultation.patient.file_number || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm text-slate-500">
                                                {consultation.completed_at 
                                                    ? format(new Date(consultation.completed_at), 'MMM d, HH:mm')
                                                    : '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant="outline" className="text-xs">
                                                {consultation.appointment?.type || 'Consultation'}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            {consultation.has_surgical_case ? (
                                                <Badge className="bg-green-100 text-green-700 text-xs">
                                                    Planned
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-xs text-slate-500">
                                                    Pending Plan
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                {consultation.has_surgical_case ? (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm"
                                                        onClick={() => router.push(`/theater-tech/surgical-cases/${consultation.surgical_case_id}/plan`)}
                                                    >
                                                        <Eye className="h-4 w-4 mr-1" />
                                                        View Plan
                                                    </Button>
                                                ) : (
                                                    <Button 
                                                        size="sm"
                                                        onClick={() => handleCreateCase(consultation.id)}
                                                        disabled={creatingCase === consultation.id}
                                                    >
                                                        {creatingCase === consultation.id ? (
                                                            <Clock className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Scissors className="h-4 w-4 mr-1" />
                                                        )}
                                                        Plan Surgery
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}