'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { nurseFormsApi, MedicationSearchItem } from '@/lib/api/nurse-forms';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, Plus, Pill } from 'lucide-react';
import { toast } from 'sonner';

interface MedicationSearchModalProps {
    caseId: string;
    isOpen: boolean;
    onClose: () => void;
    onSelect: (med: MedicationSearchItem) => void;
}

export function MedicationSearchModal({ caseId, isOpen, onClose, onSelect }: MedicationSearchModalProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const { data: results, isLoading, isError } = useQuery({
        queryKey: ['medications', 'search', searchQuery],
        queryFn: () => nurseFormsApi.searchMedications(caseId, searchQuery),
        enabled: isOpen,
        // debounce can be added here if needed
    });

    const medications = results?.success ? results.data : [];

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Search Medications</DialogTitle>
                    <DialogDescription>
                        Find medications from inventory to administer to this patient.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Type medication name or SKU..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <ScrollArea className="h-[300px] border rounded-md p-2">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
                                <Loader2 className="h-6 w-6 animate-spin" />
                                <span>Searching inventory...</span>
                            </div>
                        ) : medications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <Search className="h-8 w-8 mb-2 opacity-20" />
                                <span>No medications found</span>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {medications.map((med) => (
                                    <div
                                        key={med.id}
                                        className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-all"
                                        onClick={() => onSelect(med)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-full">
                                                <Pill className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">{med.name}</p>
                                                <p className="text-xs text-slate-500">
                                                    SKU: {med.sku || 'N/A'} • {med.quantity_on_hand} in stock
                                                </p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    {/* Optionally allow custom entry if not in inventory */}
                    {/* <Button variant="secondary" onClick={() => onSelect({ id: -1, name: searchQuery, ... })}>Add Custom Medication</Button> */}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
