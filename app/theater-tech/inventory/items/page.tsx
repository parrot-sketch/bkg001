'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Package, Search, RefreshCw, AlertTriangle, CheckCircle2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';

interface InventoryItem {
  id: number;
  name: string;
  sku: string | null;
  category: string;
  quantity_on_hand: number;
  reorder_point: number;
  unit_cost: number | null;
  is_active: boolean;
  unit_of_measure: string;
}

interface ItemsResponse {
  data: InventoryItem[];
  pagination: { page: number; pageSize: number; totalCount: number; totalPages: number };
}

function ItemsContent() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || 'all');
  const [belowReorderOnly, setBelowReorderOnly] = useState(searchParams.get('belowReorderOnly') === 'true');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (isAuthenticated && user) loadItems();
  }, [isAuthenticated, user, debouncedSearch, categoryFilter, belowReorderOnly, page]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (categoryFilter && categoryFilter !== 'all') params.set('category', categoryFilter);
      if (belowReorderOnly) params.set('belowReorderOnly', 'true');
      params.set('page', page.toString());
      params.set('limit', '20');

      const response = await apiClient.request<ItemsResponse>(`/inventory/items?${params}`);
      if (response.success) {
        setItems(response.data.data);
        setTotalCount(response.data.pagination.totalCount);
        setTotalPages(response.data.pagination.totalPages);
      }
    } catch (err) {
      toast.error('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) return <div className="flex items-center justify-center h-screen"><p className="text-sm text-slate-400">Authenticating...</p></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Item Catalog</h1>
        <p className="text-sm text-slate-500 mt-1">Browse and manage inventory items</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Items</CardTitle>
              <CardDescription>{loading ? 'Loading...' : `${totalCount} item(s)`}</CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                <Input placeholder="Search..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setPage(1); }} className="pl-8 w-48" />
              </div>
              <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); setPage(1); }}>
                <SelectTrigger className="w-36"><SelectValue placeholder="All Categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="MEDICATION">Medication</SelectItem>
                  <SelectItem value="ANESTHETIC">Anesthetic</SelectItem>
                  <SelectItem value="DISPOSABLE">Disposable</SelectItem>
                  <SelectItem value="SUTURE">Suture</SelectItem>
                  <SelectItem value="DRESSING">Dressing</SelectItem>
                  <SelectItem value="IMPLANT">Implant</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
              <Button variant={belowReorderOnly ? "secondary" : "outline"} size="sm" onClick={() => { setBelowReorderOnly(!belowReorderOnly); setPage(1); }}>
                <AlertTriangle className="h-4 w-4 mr-1" /> Low Stock
              </Button>
              <Button variant="outline" size="sm" onClick={loadItems} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && items.length === 0 ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-900">No items found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">On Hand</TableHead>
                  <TableHead className="text-right">Reorder Pt</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(item => {
                  const low = item.quantity_on_hand <= item.reorder_point;
                  return (
                    <TableRow key={item.id} className={low ? 'bg-amber-50' : ''}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell><span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{item.sku || '—'}</span></TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{item.category}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.unit_of_measure}</TableCell>
                      <TableCell className="text-right">
                        <span className={cn("font-bold", low ? "text-amber-600" : "text-emerald-600")}>{item.quantity_on_hand}</span>
                        {low && <AlertTriangle className="h-3 w-3 text-amber-500 inline ml-1" />}
                      </TableCell>
                      <TableCell className="text-right text-sm">{item.reorder_point}</TableCell>
                      <TableCell>
                        {item.is_active ? (
                          <Badge className="bg-emerald-100 text-emerald-700 text-xs">Active</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Inactive</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function TheaterTechItemsPage() {
  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>}>
      <ItemsContent />
    </Suspense>
  );
}
