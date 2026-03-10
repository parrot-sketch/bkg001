'use client';

import { useState, useMemo } from 'react';
import { Package, Plus, Search, Check, AlertTriangle, Loader2, ChevronRight } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import type { DayboardCaseDto } from '@/application/dtos/TheaterTechDtos';
import { toast } from 'sonner';
import { useInventoryPicklist, PicklistItem, ConsumptionInput } from '@/hooks/theater-tech/useInventoryPicklist';
import { useQuery } from '@tanstack/react-query';
import { isSuccess } from '@/lib/http/apiResponse';
import { InventoryBatchDto } from '@/application/dtos/TheaterTechDtos';

interface InventoryPicklistDialogProps {
    caseData: DayboardCaseDto;
    onClose: () => void;
}

export function InventoryPicklistDialog({ caseData, onClose }: InventoryPicklistDialogProps) {
    const { data: items = [], isLoading, logConsumption, isLogging } = useInventoryPicklist(caseData.id);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Batch Selection State
    const [selectingBatchForItem, setSelectingBatchForItem] = useState<PicklistItem | null>(null);
    const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
    const [consumptionQty, setConsumptionQty] = useState<number>(1);

    // Fetch batches for selected item
    const { data: batches = [], isLoading: isLoadingBatches } = useQuery<InventoryBatchDto[]>({
        queryKey: ['inventory-batches', selectingBatchForItem?.inventoryItemId],
        queryFn: async () => {
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`/api/inventory/batches?itemId=${selectingBatchForItem?.inventoryItemId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            if (!isSuccess(json)) throw new Error(json.error || 'Failed to fetch batches');
            return json.data as InventoryBatchDto[];
        },
        enabled: !!selectingBatchForItem
    });

    const handleLogUsage = () => {
        if (!selectingBatchForItem || !selectedBatchId) return;

        const input: ConsumptionInput = {
            inventoryItemId: selectingBatchForItem.inventoryItemId,
            batchId: selectedBatchId,
            quantityUsed: consumptionQty,
            notes: 'Logged via Theater Tech Picklist'
        };

        logConsumption([input], {
            onSuccess: () => {
                setSelectingBatchForItem(null);
                setSelectedBatchId(null);
                setConsumptionQty(1);
            }
        });
    };

    const filteredItems = useMemo(() => 
        items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [items, searchTerm]);

    const handleFinalize = () => {
        toast.info('Picklist review complete. Usage has been recorded.');
        onClose();
    };

    return (
        <>
            <Dialog open={true} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[700px] h-[85vh] flex flex-col p-0">
                    <div className="p-6 border-b shrink-0 bg-slate-50/50">
                        <DialogHeader>
                            <div className="flex items-center gap-2">
                                <Package className="h-5 w-5 text-blue-600" />
                                <DialogTitle className="text-xl">Surgical Pick-list & Consumption</DialogTitle>
                            </div>
                            <DialogDescription className="mt-2">
                                Review items scheduled for this case. Log physical consumption to deduct stock and bill the patient.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="mt-4 flex items-center justify-between p-3 bg-white rounded-md border text-sm">
                            <div>
                                <span className="font-semibold text-slate-800">{caseData.patient.fullName}</span>
                                <span className="text-muted-foreground ml-2">#{caseData.patient.fileNumber}</span>
                            </div>
                            <Badge variant="outline" className="font-medium bg-slate-50">
                                {caseData.procedureName || 'Procedure TBD'}
                            </Badge>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-auto p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <div className="relative w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search requested items..."
                                    className="pl-8 h-9"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" size="sm" className="h-9 gap-2">
                                <Plus className="h-4 w-4" />
                                Log Unplanned Item
                            </Button>
                        </div>

                        <div className="rounded-md border shadow-sm overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow>
                                        <TableHead>Item</TableHead>
                                        <TableHead className="text-center">Req.</TableHead>
                                        <TableHead className="text-center">Used</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">
                                                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Loading picklist...
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredItems.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                No items requested by surgeon.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredItems.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2">
                                                        {item.isImplant && <Package className="h-3.5 w-3.5 text-blue-500" />}
                                                        <div>
                                                            <p>{item.name}</p>
                                                            <p className="text-[10px] text-muted-foreground font-normal uppercase">{item.unitOfMeasure}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center text-muted-foreground font-mono">
                                                    {item.requiredQty}
                                                </TableCell>
                                                <TableCell className="text-center font-mono font-bold">
                                                    {item.consumedQty}
                                                </TableCell>
                                                <TableCell>
                                                    {item.status === 'FULFILLED' ? (
                                                        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 shadow-none">
                                                            <Check className="h-3 w-3 mr-1" /> Logged
                                                        </Badge>
                                                    ) : item.status === 'PARTIAL' ? (
                                                        <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 shadow-none">
                                                            Partial
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-slate-400 border-slate-200 bg-slate-50 shadow-none">
                                                            Pending
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button 
                                                        size="sm" 
                                                        variant="ghost" 
                                                        className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                        onClick={() => {
                                                            setSelectingBatchForItem(item);
                                                            setConsumptionQty(Math.max(1, item.requiredQty - item.consumedQty));
                                                        }}
                                                    >
                                                        Log Usage <ChevronRight className="ml-1 h-3 w-3" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        
                        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm">
                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                            <p>
                                Items logged here will decrement from the active stock batches and automatically generate billable line items for the patient. Verify quantities and lot numbers carefully.
                            </p>
                        </div>
                    </div>

                    <div className="p-4 border-t shrink-0 bg-white">
                        <DialogFooter className="flex items-center justify-between sm:justify-between">
                            <Button variant="ghost" onClick={onClose} disabled={isLogging}>
                                Close
                            </Button>
                            <Button onClick={handleFinalize} disabled={isLogging} className="min-w-[140px]">
                                Done
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Batch Selection Sub-Dialog */}
            <Dialog open={!!selectingBatchForItem} onOpenChange={(open) => !open && setSelectingBatchForItem(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Log Usage: {selectingBatchForItem?.name}</DialogTitle>
                        <DialogDescription>
                            Select the specific stock batch consumed during surgery.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase">Select Batch</label>
                            {isLoadingBatches ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 bg-slate-50 rounded-md border border-dashed">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Loading batches...
                                </div>
                            ) : batches.length === 0 ? (
                                <div className="text-sm text-red-600 p-4 bg-red-50 rounded-md border border-red-100">
                                    No active stock batches found for this item.
                                </div>
                            ) : (
                                <div className="grid gap-2 max-h-48 overflow-auto pr-1">
                                    {batches.map((batch: any) => (
                                        <button
                                            key={batch.id}
                                            disabled={batch.quantity_remaining <= 0}
                                            onClick={() => setSelectedBatchId(batch.id)}
                                            className={cn(
                                                "flex items-center justify-between p-3 rounded-lg border text-left transition-all",
                                                selectedBatchId === batch.id 
                                                    ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" 
                                                    : "border-slate-200 hover:border-slate-300",
                                                batch.quantity_remaining <= 0 && "opacity-50 cursor-not-allowed bg-slate-50"
                                            )}
                                        >
                                            <div className="space-y-0.5">
                                                <p className="text-sm font-bold">Batch: {batch.batch_number}</p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    Expires: {batch.expiry_date ? new Date(batch.expiry_date).toLocaleDateString() : 'N/A'}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-medium">{batch.quantity_remaining} available</p>
                                                {selectedBatchId === batch.id && <Check className="h-4 w-4 text-blue-600 ml-auto mt-0.5" />}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase">Quantity Consumed</label>
                            <Input 
                                type="number" 
                                min={1} 
                                value={consumptionQty} 
                                onChange={(e) => setConsumptionQty(parseInt(e.target.value) || 1)}
                                className="h-10 text-lg font-bold"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectingBatchForItem(null)}>Cancel</Button>
                        <Button 
                            onClick={handleLogUsage} 
                            disabled={!selectedBatchId || isLogging || batches.length === 0}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isLogging ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                            Record Consumption
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

// Helper function
function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ');
}
