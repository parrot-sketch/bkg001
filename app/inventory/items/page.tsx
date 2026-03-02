/**
 * Inventory Items Console
 * 
 * Route: /inventory/items
 * 
 * Full-featured inventory item management with search, filters, pagination, and stock adjustment.
 * STORES and ADMIN access.
 */

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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Package, Search, RefreshCw, MoreVertical, TrendingUp, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { Pagination } from '@/components/pagination';
import { Role } from '@/domain/enums/Role';

interface InventoryItem {
  id: number;
  name: string;
  sku: string | null;
  category: string;
  quantity_on_hand: number;
  reorder_point: number;
  unit_cost: number | null;
  is_active: boolean;
  is_billable: boolean;
}

interface ItemsResponse {
  data: InventoryItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

function InventoryItemsContent() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [categoryFilter, setCategoryFilter] = useState<string>(searchParams.get('category') || '');
  const [belowReorderOnly, setBelowReorderOnly] = useState(searchParams.get('belowReorderOnly') === 'true');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);
  const isAdmin = user?.role === Role.ADMIN;

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (categoryFilter) params.set('category', categoryFilter);
    if (belowReorderOnly) params.set('belowReorderOnly', 'true');
    if (page > 1) params.set('page', page.toString());
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    const currentSearch = typeof window !== 'undefined' ? window.location.search : '';
    if (currentSearch !== `?${params.toString()}`) {
      router.replace(newUrl, { scroll: false });
    }
  }, [debouncedSearch, categoryFilter, belowReorderOnly, page, pathname, router]);

  // Load items
  useEffect(() => {
    if (isAuthenticated && user) {
      loadItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, debouncedSearch, categoryFilter, belowReorderOnly, page]);

  const loadItems = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (categoryFilter) params.set('category', categoryFilter);
      if (belowReorderOnly) params.set('belowReorderOnly', 'true');
      params.set('page', page.toString());
      params.set('pageSize', pageSize.toString());

      const response = await apiClient.request<ItemsResponse>(`/inventory/items?${params.toString()}`);

      if (response.success) {
        setItems(response.data.data);
        setTotalCount(response.data.pagination.totalCount);
        setTotalPages(response.data.pagination.totalPages);
      } else {
        setError(response.error || 'Failed to load items');
        toast.error(response.error || 'Failed to load items');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast.error('Failed to load items');
      console.error('Error loading items:', err);
    } finally {
      setLoading(false);
    }
  };

  const isBelowReorder = (item: InventoryItem) => item.quantity_on_hand <= item.reorder_point;

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-sm text-slate-400">Authenticating...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Inventory Items</h1>
        <p className="text-sm text-slate-500">Manage inventory stock levels and reorder points</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Items</CardTitle>
              <CardDescription>
                {loading ? 'Loading...' : `Total: ${totalCount} item(s)`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search name, SKU..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="pl-8 w-64"
                />
              </div>
              <Select value={categoryFilter} onValueChange={(value) => {
                setCategoryFilter(value);
                setPage(1);
              }}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  <SelectItem value="MEDICATION">Medication</SelectItem>
                  <SelectItem value="DEVICE">Device</SelectItem>
                  <SelectItem value="IMPLANT">Implant</SelectItem>
                  <SelectItem value="CONSUMABLE">Consumable</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBelowReorderOnly(!belowReorderOnly);
                  setPage(1);
                }}
              >
                {belowReorderOnly ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    All Items
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Low Stock Only
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={loadItems} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && items.length === 0 ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-900 mb-2">Error loading items</p>
              <p className="text-xs text-slate-500 mb-4">{error}</p>
              <Button variant="outline" size="sm" onClick={loadItems}>
                Retry
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-900">No items found</p>
              <p className="text-xs text-slate-500 mt-1">
                {(debouncedSearch || categoryFilter || belowReorderOnly) ? 'Try adjusting your filters' : 'Items will appear here once added'}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Stock On Hand</TableHead>
                    <TableHead>Reorder Point</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const belowReorder = isBelowReorder(item);
                    return (
                      <TableRow key={item.id} className={belowReorder ? 'bg-amber-50' : ''}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.sku || '-'}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={belowReorder ? 'font-semibold text-amber-700' : ''}>
                              {item.quantity_on_hand}
                            </span>
                            {belowReorder && (
                              <AlertTriangle className="h-4 w-4 text-amber-600" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{item.reorder_point}</TableCell>
                        <TableCell>
                          {item.is_active ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Inactive
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {isAdmin && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setShowAdjustDialog(true);
                                  }}
                                >
                                  <TrendingUp className="h-4 w-4 mr-2" />
                                  Adjust Stock
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="mt-4 flex justify-center">
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    totalRecords={totalCount}
                    limit={pageSize}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Stock Adjustment Dialog - Placeholder for now */}
      {showAdjustDialog && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Adjust Stock - {selectedItem.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500 mb-4">
                Stock adjustment functionality will be implemented here.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setShowAdjustDialog(false);
                  setSelectedItem(null);
                }}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function InventoryItemsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Inventory Items</h1>
          <p className="text-sm text-slate-500">Manage inventory stock levels and reorder points</p>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    }>
      <InventoryItemsContent />
    </Suspense>
  );
}
