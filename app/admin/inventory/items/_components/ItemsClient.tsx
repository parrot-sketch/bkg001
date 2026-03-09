'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter, Edit, Package } from 'lucide-react';
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
import { CreateItemDialog } from './CreateItemDialog';

export function ItemsClient({ initialItems }: { initialItems: any[] }) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const filteredItems = initialItems.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search items by name or SKU..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="gap-2">
                        <Filter className="h-4 w-4" />
                        Filter
                    </Button>
                    <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add New Item
                    </Button>
                </div>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Item Name</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead className="text-right">Reorder Pt.</TableHead>
                            <TableHead className="text-right">On Hand</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredItems.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                    No items found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredItems.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            {item.is_implant && <Package className="h-4 w-4 text-blue-500" />}
                                            {item.name}
                                        </div>
                                        {item.manufacturer && (
                                            <span className="text-xs text-muted-foreground block">{item.manufacturer}</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground font-mono text-xs">
                                        {item.sku || 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{item.category}</Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {item.unit_of_measure}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {item.reorder_point}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        {item.quantity_on_hand}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" title="Edit Item">
                                            <Edit className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <CreateItemDialog 
                open={isCreateOpen} 
                onOpenChange={setIsCreateOpen} 
                onSuccess={() => {
                    setIsCreateOpen(false);
                    router.refresh();
                }} 
            />
        </div>
    );
}
