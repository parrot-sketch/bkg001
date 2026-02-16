'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nurseFormsApi, MedicationAdministration } from '@/lib/api/nurse-forms';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, AlertCircle, Trash2, Clock, CheckCircle2, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useState } from 'react';
import { MedicationSearchModal } from './MedicationSearchModal';
import { AdministerMedicationDialog } from './AdministerMedicationDialog';
import { MedicationBillingSummary } from './MedicationBillingSummary';
import { MedicationChartPrint } from './MedicationChartPrint';

interface MedicationAdministrationListProps {
    caseId: string;
    patient?: {
        first_name: string;
        last_name: string;
        file_number: string;
    };
    formResponseId?: string;
    readOnly?: boolean;
}

export function MedicationAdministrationList({ caseId, patient, formResponseId, readOnly }: MedicationAdministrationListProps) {
    const queryClient = useQueryClient();
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [selectedMed, setSelectedMed] = useState<any>(null);
    const [isAdministerOpen, setIsAdministerOpen] = useState(false);

    const { data: res, isLoading } = useQuery({
        queryKey: ['med-admin', caseId],
        queryFn: () => nurseFormsApi.getMedicationAdministrations(caseId),
    });

    const handlePrint = () => {
        window.print();
    };

    const voidMutation = useMutation({
        mutationFn: ({ adminId, reason }: { adminId: string, reason: string }) =>
            nurseFormsApi.voidMedication(caseId, adminId, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['med-admin', caseId] });
            toast.success('Medication voided');
        },
        onError: () => {
            toast.error('Failed to void medication');
        },
    });

    const handleVoid = (adminId: string) => {
        const reason = window.prompt('Reason for voiding?');
        if (reason) {
            voidMutation.mutate({ adminId, reason });
        }
    };

    if (isLoading) return <div className="flex justify-center p-4"><Loader2 className="animate-spin h-5 w-5 text-slate-400" /></div>;

    const administrations = res?.success ? res.data : [];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    Medication History
                </h4>
                <div className="flex items-center gap-2">
                    {administrations.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handlePrint}
                            className="h-8 gap-1.5 text-slate-500"
                        >
                            <Printer className="w-3.5 h-3.5" /> Print Chart
                        </Button>
                    )}
                    {!readOnly && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsSearchOpen(true)}
                            className="h-8 gap-1.5"
                        >
                            <Plus className="w-3.5 h-3.5" /> Record Med
                        </Button>
                    )}
                </div>
            </div>

            {administrations.length > 0 && (
                <MedicationBillingSummary administrations={administrations} />
            )}

            {administrations.length === 0 ? (
                <div className="text-center p-8 border-2 border-dashed border-slate-100 rounded-lg bg-slate-50/50">
                    <p className="text-sm text-slate-400">No medications administered yet</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {administrations.map((admin) => (
                        <div
                            key={admin.id}
                            className={`p-3 border rounded-lg flex items-center justify-between bg-white transition-colors ${admin.status === 'VOIDED' ? 'opacity-60 bg-slate-50 border-slate-200' : 'border-slate-100 hover:border-slate-300'
                                }`}
                        >
                            <div className="flex gap-3 items-start">
                                <div className={`mt-0.5 p-1.5 rounded-full ${admin.status === 'ADMINISTERED' ? 'bg-emerald-50 text-emerald-600' :
                                    admin.status === 'DRAFT' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                                    }`}>
                                    {admin.status === 'ADMINISTERED' ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                                        admin.status === 'DRAFT' ? <Clock className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">{admin.name}</p>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                        <Badge variant={
                                            admin.status === 'ADMINISTERED' ? 'secondary' :
                                                admin.status === 'DRAFT' ? 'outline' : 'destructive'
                                        } className="text-[10px] px-1.5 py-0 mr-1">
                                            {admin.status === 'ADMINISTERED' ? 'GIVEN' : admin.status === 'DRAFT' ? 'PLANNED' : admin.status}
                                        </Badge>
                                        <span>{admin.dose_value} {admin.dose_unit}</span>
                                        <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                        <span>{admin.route}</span>
                                        {admin.administered_at && (
                                            <>
                                                <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                                <span>{format(new Date(admin.administered_at), 'HH:mm')}</span>
                                            </>
                                        )}
                                    </div>
                                    {admin.void_reason && (
                                        <p className="text-xs text-rose-500 mt-1 italic">Void Reason: {admin.void_reason}</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3">


                                {!readOnly && admin.status !== 'VOIDED' && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleVoid(admin.id)}
                                        className="h-7 w-7 text-slate-400 hover:text-rose-500"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <MedicationSearchModal
                caseId={caseId}
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                onSelect={(med) => {
                    setSelectedMed(med);
                    setIsSearchOpen(false);
                    setIsAdministerOpen(true);
                }}
            />

            <AdministerMedicationDialog
                caseId={caseId}
                formResponseId={formResponseId}
                medication={selectedMed}
                isOpen={isAdministerOpen}
                onClose={() => setIsAdministerOpen(false)}
                onSuccess={() => {
                    setIsAdministerOpen(false);
                    queryClient.invalidateQueries({ queryKey: ['med-admin', caseId] });
                }}
            />

            {/* Hidden for screen, visible for print */}
            <div className="hidden print:block">
                {patient && <MedicationChartPrint patient={patient} administrations={administrations} />}
            </div>
        </div>
    );
}
