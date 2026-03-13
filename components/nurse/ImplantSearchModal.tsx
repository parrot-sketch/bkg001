'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { nurseFormsApi, ImplantSearchItem } from '@/lib/api/nurse-forms';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, Package } from 'lucide-react';

interface ImplantSearchModalProps {
    caseId: string;
    isOpen: boolean;
    onClose: () => void;
    onSelect: (implant: ImplantSearchItem) => void;
}

export function ImplantSearchModal({ caseId, isOpen, onClose, onSelect }: ImplantSearchModalProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const { data: results, isLoading, isError } = useQuery({
        queryKey: ['implants', 'search', searchQuery],
        queryFn: () => nurseFormsApi.searchImplants(caseId, searchQuery),
        enabled: isOpen,
    });

    const implants = results?.success ? results.data : [];

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Search Implants / Prosthetics</DialogTitle>
                    <DialogDescription>
                        Find implants from inventory to record in this procedure.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Type implant name or SKU..."
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
                        ) : implants.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <Package className="h-8 w-8 mb-2 opacity-20" />
                                <span>No implants found</span>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {implants.map((implant) => (
                                    <div
                                        key={implant.id}
                                        className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-all"
                                        onClick={() => onSelect(implant)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-teal-50 text-teal-600 rounded-full">
                                                <Package className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">{implant.name}</p>
                                                <p className="text-xs text-slate-500">
                                                    SKU: {implant.sku || 'N/A'} • {implant.quantity_on_hand} in stock
                                                </p>
                                                {implant.category && (
                                                    <p className="text-xs text-teal-600">{implant.category}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-slate-900">${implant.unit_cost}</p>
                                            <p className="text-xs text-slate-500">per {implant.unit_of_measure}</p>
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
