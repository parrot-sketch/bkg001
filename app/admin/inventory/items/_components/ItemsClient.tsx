'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
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
import { Plus, Search, MoreHorizontal, Package, Filter, ArrowUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { ItemSheet, InventoryItemFormData } from './ItemSheet';

export function ItemsClient({ initialItems }: { initialItems: any[] }) {
    const router = useRouter();
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});

    // Sheet State
    const [isSheetOpen, setIsSheetOpen] = React.useState(false);
    const [selectedItem, setSelectedItem] = React.useState<InventoryItemFormData | null>(null);

    const handleEdit = (item: any) => {
        setSelectedItem({
            id: item.id,
            name: item.name,
            sku: item.sku || '',
            category: item.category,
            uom: item.unit_of_measure || 'Unit',
            reorderPoint: item.reorder_point?.toString() || '0',
            isImplant: item.is_implant || false,
            manufacturer: item.manufacturer || '',
        });
        setIsSheetOpen(true);
    };

    const handleAdd = () => {
        setSelectedItem(null);
        setIsSheetOpen(true);
    };

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'name',
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="-ml-4 h-8 data-[state=open]:bg-accent"
                    >
                        Item Name
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-medium flex items-center gap-2">
                        {row.original.is_implant && <Package className="h-3.5 w-3.5 text-blue-500" />}
                        {row.getValue('name')}
                    </span>
                    {row.original.manufacturer && (
                        <span className="text-xs text-muted-foreground">{row.original.manufacturer}</span>
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'sku',
            header: 'SKU / Code',
            cell: ({ row }) => (
                <span className="text-xs font-mono text-muted-foreground">
                    {row.getValue('sku') || 'N/A'}
                </span>
            ),
        },
        {
            accessorKey: 'category',
            header: 'Category',
            cell: ({ row }) => (
                <Badge variant="secondary" className="font-normal text-xs">
                    {row.getValue('category')}
                </Badge>
            ),
            filterFn: (row, id, value) => {
                return value.includes(row.getValue(id));
            },
        },
        {
            accessorKey: 'unit_of_measure',
            header: 'Unit',
            cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.getValue('unit_of_measure')}</span>,
        },
        {
            accessorKey: 'reorder_point',
            header: () => <div className="text-right">Reorder Pt.</div>,
            cell: ({ row }) => <div className="text-right text-sm">{row.getValue('reorder_point')}</div>,
        },
        {
            accessorKey: 'quantity_on_hand',
            header: () => <div className="text-right">On Hand</div>,
            cell: ({ row }) => {
                const qty = row.getValue('quantity_on_hand') as number;
                const reorder = row.original.reorder_point as number;
                const isLow = qty <= reorder;

                return (
                    <div className="text-right">
                        <span className={`font-medium text-sm ${isLow ? 'text-red-600' : 'text-slate-900'}`}>
                            {qty}
                        </span>
                    </div>
                );
            },
        },
        {
            id: 'actions',
            cell: ({ row }) => {
                const item = row.original;

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
                            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(item.sku || '')}>
                                Copy SKU
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEdit(item)}>
                                Edit Item
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600 focus:bg-red-50 focus:text-red-700">
                                Deactivate Item
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];

    const table = useReactTable({
        data: initialItems,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
    });

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search items by name..."
                        value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
                        onChange={(event) =>
                            table.getColumn('name')?.setFilterValue(event.target.value)
                        }
                        className="pl-8 h-9 bg-white"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-9 gap-2">
                        <Filter className="h-4 w-4" />
                        Filters
                    </Button>
                    <Button size="sm" onClick={handleAdd} className="h-9 gap-2">
                        <Plus className="h-4 w-4" />
                        Add New Item
                    </Button>
                </div>
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
                                    No items found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Setup */}
            <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                    Showing {table.getFilteredRowModel().rows.length} items
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

            {/* Slide-out Sheet for Create/Edit */}
            <ItemSheet 
                open={isSheetOpen}
                onOpenChange={setIsSheetOpen}
                initialData={selectedItem}
                onSuccess={() => {
                    setIsSheetOpen(false);
                    router.refresh(); // Ideally replace with React Query invalidation later
                }}
            />
        </div>
    );
}
