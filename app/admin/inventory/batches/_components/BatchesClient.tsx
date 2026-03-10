'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { Search, Filter, AlertTriangle, Package, Plus, ArrowUpDown, MoreHorizontal } from 'lucide-react';

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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { ReceiveStockSheet } from './ReceiveStockSheet';

export function BatchesClient({ initialBatches, inventoryItems }: { initialBatches: any[], inventoryItems: any[] }) {
    const router = useRouter();
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    
    // Sheet State
    const [isReceiveOpen, setIsReceiveOpen] = React.useState(false);

    // Custom Filter for "Expiring Only"
    const [showExpiringOnly, setShowExpiringOnly] = React.useState(false);

    const filteredBatches = React.useMemo(() => {
        if (!showExpiringOnly) return initialBatches;
        return initialBatches.filter(batch => {
            const days = Math.ceil((new Date(batch.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            return days <= 30; // Expired or expiring within 30 days
        });
    }, [initialBatches, showExpiringOnly]);

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'itemName',
            accessorFn: row => row.inventory_item.name,
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="-ml-4 h-8"
                    >
                        Item Name
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-medium flex items-center gap-2">
                        {row.original.inventory_item.is_implant && <Package className="h-3.5 w-3.5 text-blue-500" />}
                        {row.original.inventory_item.name}
                    </span>
                    {row.original.inventory_item.sku && (
                        <span className="text-xs text-muted-foreground">{row.original.inventory_item.sku}</span>
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'batch_number',
            header: 'Batch / Serial',
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="text-sm font-medium">{row.getValue('batch_number')}</span>
                    {row.original.serial_number && (
                        <span className="text-xs font-mono text-muted-foreground">SN: {row.original.serial_number}</span>
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'category',
            accessorFn: row => row.inventory_item.category,
            header: 'Category',
            cell: ({ row }) => (
                <Badge variant="secondary" className="font-normal text-xs">
                    {row.original.inventory_item.category}
                </Badge>
            ),
        },
        {
            accessorKey: 'expiry_date',
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="-ml-4 h-8"
                    >
                        Expiry Status
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const expiry = new Date(row.getValue('expiry_date') as string);
                const isExpired = expiry < new Date();
                const daysUntil = Math.ceil((expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                const isExpiringSoon = !isExpired && daysUntil <= 30;

                return (
                    <div>
                        {isExpired ? (
                            <Badge variant="destructive" className="gap-1 shadow-sm">
                                <AlertTriangle className="h-3 w-3" />
                                Expired {format(expiry, 'MMM d, yyyy')}
                            </Badge>
                        ) : isExpiringSoon ? (
                            <Badge className="bg-amber-500 hover:bg-amber-600 gap-1 text-white shadow-sm">
                                <AlertTriangle className="h-3 w-3" />
                                Expiring {format(expiry, 'MMM d, yyyy')}
                            </Badge>
                        ) : (
                            <span className="text-sm text-muted-foreground">
                                {format(expiry, 'MMM d, yyyy')}
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'cost_per_unit',
            header: () => <div className="text-right">Unit Cost</div>,
            cell: ({ row }) => {
                const cost = parseFloat(row.getValue('cost_per_unit') as string);
                return <div className="text-right text-muted-foreground">{cost.toFixed(2)}</div>;
            },
        },
        {
            accessorKey: 'quantity_remaining',
            header: () => <div className="text-right">Qty Rem.</div>,
            cell: ({ row }) => {
                const qty = parseInt(row.getValue('quantity_remaining') as string);
                return <div className="text-right font-bold text-lg">{qty}</div>;
            },
        },
        {
            id: 'actions',
            cell: ({ row }) => {
                const batch = row.original;
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(batch.batch_number)}>
                                Copy Batch Number
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                                Adjust Stock Level
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600 focus:bg-red-50 focus:text-red-700">
                                Mark as Depleted
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];

    const table = useReactTable({
        data: filteredBatches,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
        },
    });

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex w-full sm:w-auto items-center gap-2">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name..."
                            value={(table.getColumn('itemName')?.getFilterValue() as string) ?? ''}
                            onChange={(event) =>
                                table.getColumn('itemName')?.setFilterValue(event.target.value)
                            }
                            className="pl-8 h-9 bg-white shadow-sm"
                        />
                    </div>
                    <Button
                        variant={showExpiringOnly ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => setShowExpiringOnly(!showExpiringOnly)}
                        className={`h-9 gap-2 shadow-sm ${showExpiringOnly ? "bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-200" : ""}`}
                    >
                        <Filter className="h-4 w-4" />
                        Expiring Only
                    </Button>
                </div>
                
                <Button size="sm" onClick={() => setIsReceiveOpen(true)} className="h-9 gap-2 shadow-sm">
                    <Plus className="h-4 w-4" />
                    Receive Stock
                </Button>
            </div>

            {/* Data Table */}
            <div className="rounded-md border bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id} className="whitespace-nowrap">
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && 'selected'}
                                    className="hover:bg-slate-50/50"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="py-2.5">
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    No batches found. Try clearing filters.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Setup */}
            <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                    Showing {table.getFilteredRowModel().rows.length} batches
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Next
                    </Button>
                </div>
            </div>

            {/* Receive Stock UI */}
            <ReceiveStockSheet 
                open={isReceiveOpen} 
                onOpenChange={setIsReceiveOpen} 
                onSuccess={() => {
                    setIsReceiveOpen(false);
                    router.refresh();
                }}
                inventoryItems={inventoryItems}
            />
        </div>
    );
}
