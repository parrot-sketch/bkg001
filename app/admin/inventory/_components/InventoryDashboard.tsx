'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
    BarChart3,
    Package,
    AlertTriangle,
    Plus,
    Search,
    Filter
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface InventoryItem {
    id: number;
    name: string;
    sku: string | null;
    category: string;
    is_implant: boolean;
}

interface InventoryBatch {
    id: string;
    batch_number: string;
    serial_number: string | null;
    expiry_date: Date;
    quantity_remaining: number;
    cost_per_unit: number;
    inventory_item: {
        name: string;
        sku: string | null;
        category: string;
    };
}

interface InventoryDashboardProps {
    initialBatches: InventoryBatch[];
    inventoryItems: InventoryItem[];
}

export function InventoryDashboard({ initialBatches, inventoryItems }: InventoryDashboardProps) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [showExpiringOnly, setShowExpiringOnly] = useState(false);
    const [isReceiveOpen, setIsReceiveOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State for Receive Stock
    const [newItemId, setNewItemId] = useState<string>('');
    const [newBatch, setNewBatch] = useState('');
    const [newSerial, setNewSerial] = useState('');
    const [newExpiry, setNewExpiry] = useState('');
    const [newQty, setNewQty] = useState('1');
    const [newCost, setNewCost] = useState('0');

    // Computed Metrics
    const totalValue = initialBatches.reduce((acc, b) => acc + (b.cost_per_unit * b.quantity_remaining), 0);
    const expiringSoonCount = initialBatches.filter(b => {
        const daysUntilExpiry = Math.ceil((new Date(b.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
    }).length;
    const expiredCount = initialBatches.filter(b => new Date(b.expiry_date) < new Date()).length;

    // Filtered Data
    const filteredBatches = initialBatches.filter(batch => {
        const matchesSearch =
            batch.inventory_item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            batch.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (batch.serial_number && batch.serial_number.toLowerCase().includes(searchTerm.toLowerCase()));

        if (showExpiringOnly) {
            const days = Math.ceil((new Date(batch.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            return matchesSearch && days <= 30;
        }
        return matchesSearch;
    });

    const handleReceiveStock = async () => {
        if (!newItemId || !newBatch || !newExpiry || !newQty) {
            toast.error('Please fill in all required fields');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/inventory/batches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    inventory_item_id: parseInt(newItemId),
                    batch_number: newBatch,
                    serial_number: newSerial || undefined,
                    expiry_date: new Date(newExpiry).toISOString(),
                    quantity: parseInt(newQty),
                    cost_per_unit: parseFloat(newCost),
                    notes: 'Received via Admin Dashboard'
                }),
            });

            if (!res.ok) throw new Error('Failed to receive stock');

            toast.success('Stock received successfully');
            setIsReceiveOpen(false);
            resetForm();
            router.refresh();
        } catch (error) {
            toast.error('Error receiving stock');
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setNewItemId('');
        setNewBatch('');
        setNewSerial('');
        setNewExpiry('');
        setNewQty('1');
        setNewCost('0');
    };

    return (
        <div className="space-y-6">
            {/* Header & Metrics */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                        <span className="font-bold text-muted-foreground">$</span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Asset Valuation</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">{expiringSoonCount}</div>
                        <p className="text-xs text-muted-foreground">Expires in &lt; 30 days</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Expired</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{expiredCount}</div>
                        <p className="text-xs text-muted-foreground">Action required</p>
                    </CardContent>
                </Card>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="flex w-full sm:w-auto items-center gap-2">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search batches..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button
                        variant={showExpiringOnly ? "secondary" : "outline"}
                        onClick={() => setShowExpiringOnly(!showExpiringOnly)}
                        className={cn("gap-2", showExpiringOnly && "bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-200")}
                    >
                        <Filter className="h-4 w-4" />
                        Expiring Only
                    </Button>
                </div>

                <Dialog open={isReceiveOpen} onOpenChange={setIsReceiveOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            Receive Stock
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Receive New Stock</DialogTitle>
                            <DialogDescription>
                                Enter the details of the incoming inventory batch.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="item" className="text-right">Item</Label>
                                <div className="col-span-3">
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={newItemId}
                                        onChange={(e) => setNewItemId(e.target.value)}
                                    >
                                        <option value="">Select Item...</option>
                                        {inventoryItems.map(item => (
                                            <option key={item.id} value={item.id}>
                                                {item.name} {item.is_implant ? '(Implant)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="batch" className="text-right">Batch/Lot</Label>
                                <Input
                                    id="batch"
                                    value={newBatch}
                                    onChange={(e) => setNewBatch(e.target.value)}
                                    className="col-span-3"
                                    placeholder="e.g. LOT-2024-X"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="serial" className="text-right">Serial #</Label>
                                <Input
                                    id="serial"
                                    value={newSerial}
                                    onChange={(e) => setNewSerial(e.target.value)}
                                    className="col-span-3"
                                    placeholder="Optional"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="expiry" className="text-right">Expiry</Label>
                                <Input
                                    id="expiry"
                                    type="date"
                                    value={newExpiry}
                                    onChange={(e) => setNewExpiry(e.target.value)}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="qty" className="text-right">Quantity</Label>
                                <Input
                                    id="qty"
                                    type="number"
                                    min="1"
                                    value={newQty}
                                    onChange={(e) => setNewQty(e.target.value)}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="cost" className="text-right">Unit Cost</Label>
                                <Input
                                    id="cost"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={newCost}
                                    onChange={(e) => setNewCost(e.target.value)}
                                    className="col-span-3"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsReceiveOpen(false)}>Cancel</Button>
                            <Button onClick={handleReceiveStock} disabled={isSubmitting}>
                                {isSubmitting ? 'Receiving...' : 'Confirm Receipt'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Data Table */}
            <div className="rounded-md border bg-white shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Item Name</TableHead>
                            <TableHead>Batch / Serial</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Expiry Status</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredBatches.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    No batches found based on current filters.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredBatches.map((batch) => {
                                const expiry = new Date(batch.expiry_date);
                                const isExpired = expiry < new Date();
                                const daysUntil = Math.ceil((expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                const isExpiringSoon = !isExpired && daysUntil <= 30;

                                return (
                                    <TableRow key={batch.id}>
                                        <TableCell className="font-medium">
                                            {batch.inventory_item.name}
                                            {batch.inventory_item.sku && (
                                                <span className="block text-xs text-muted-foreground">{batch.inventory_item.sku}</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">{batch.batch_number}</div>
                                            {batch.serial_number && (
                                                <div className="text-xs font-mono text-muted-foreground">{batch.serial_number}</div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{batch.inventory_item.category}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            {isExpired ? (
                                                <Badge variant="destructive" className="gap-1">
                                                    Expired {format(expiry, 'MMM d, yyyy')}
                                                </Badge>
                                            ) : isExpiringSoon ? (
                                                <Badge className="bg-amber-500 hover:bg-amber-600 gap-1">
                                                    Expiring {format(expiry, 'MMM d, yyyy')}
                                                </Badge>
                                            ) : (
                                                <span className="text-sm text-muted-foreground">
                                                    {format(expiry, 'MMM d, yyyy')}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {batch.quantity_remaining}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
