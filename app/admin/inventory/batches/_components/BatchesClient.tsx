'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Search, Filter, AlertTriangle, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export function BatchesClient({ initialBatches }: { initialBatches: any[] }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [showExpiringOnly, setShowExpiringOnly] = useState(false);

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

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="flex w-full sm:w-auto items-center gap-2">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name, batch, or serial..."
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
            </div>

            <div className="rounded-md border bg-card shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Item Name</TableHead>
                            <TableHead>Batch / Serial</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Expiry Status</TableHead>
                            <TableHead className="text-right">Unit Cost</TableHead>
                            <TableHead className="text-right">Qty Rem.</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredBatches.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
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
                                            <div className="flex items-center gap-2">
                                                {batch.inventory_item.is_implant && <Package className="h-4 w-4 text-blue-500" />}
                                                {batch.inventory_item.name}
                                            </div>
                                            {batch.inventory_item.sku && (
                                                <span className="block text-xs text-muted-foreground">{batch.inventory_item.sku}</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm font-medium">{batch.batch_number}</div>
                                            {batch.serial_number && (
                                                <div className="text-xs font-mono text-muted-foreground">SN: {batch.serial_number}</div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{batch.inventory_item.category}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            {isExpired ? (
                                                <Badge variant="destructive" className="gap-1">
                                                    <AlertTriangle className="h-3 w-3" />
                                                    Expired {format(expiry, 'MMM d, yyyy')}
                                                </Badge>
                                            ) : isExpiringSoon ? (
                                                <Badge className="bg-amber-500 hover:bg-amber-600 gap-1 text-white">
                                                    <AlertTriangle className="h-3 w-3" />
                                                    Expiring {format(expiry, 'MMM d, yyyy')}
                                                </Badge>
                                            ) : (
                                                <span className="text-sm text-muted-foreground">
                                                    {format(expiry, 'MMM d, yyyy')}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground">
                                            ${batch.cost_per_unit.toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-lg">
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
