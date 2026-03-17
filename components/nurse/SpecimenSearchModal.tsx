'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { nurseFormsApi, ImplantSearchItem } from '@/lib/api/nurse-forms';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, FlaskConical } from 'lucide-react';

interface SpecimenSearchModalProps {
    caseId: string;
    isOpen: boolean;
    onClose: () => void;
    onSelect: (specimen: ImplantSearchItem) => void;
}

export function SpecimenSearchModal({ caseId, isOpen, onClose, onSelect }: SpecimenSearchModalProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const { data: results, isLoading, isError } = useQuery({
        queryKey: ['specimens', 'search', searchQuery],
        queryFn: () => nurseFormsApi.searchSpecimens(caseId, searchQuery),
        enabled: isOpen,
    });

    const specimens = results?.success ? results.data : [];

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Search Specimens</DialogTitle>
                    <DialogDescription>
                        Find specimen containers from inventory.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Type specimen name or SKU..."
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
                        ) : specimens.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <FlaskConical className="h-8 w-8 mb-2 opacity-20" />
                                <span>No specimens found</span>
                                <p className="text-xs mt-1">Add specimen containers to inventory first</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {specimens.map((specimen) => (
                                    <div
                                        key={specimen.id}
                                        className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-all"
                                        onClick={() => onSelect(specimen)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-purple-50 text-purple-600 rounded-full">
                                                <FlaskConical className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">{specimen.name}</p>
                                                <p className="text-xs text-slate-500">
                                                    SKU: {specimen.sku || 'N/A'}
                                                </p>
                                                {specimen.category && (
                                                    <p className="text-xs text-purple-600">{specimen.category}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}
