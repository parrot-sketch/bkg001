'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Search, RefreshCw, Eye, CheckCircle2, XCircle, FileText, ClipboardList, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { Role } from '@/domain/enums/Role';
import { ApprovePOModal } from '@/components/admin/inventory/ApprovePOModal';

interface PurchaseOrder {
  id: string;
  po_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  vendor: { name: string };
  created_by: { first_name: string | null; last_name: string | null; email: string };
  items?: any[];
}

interface POResponse {
  data: PurchaseOrder[];
  pagination: { page: number; pageSize: number; totalCount: number; totalPages: number };
}

function PurchaseOrdersContent() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('SUBMITTED');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Summary Metrics State
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedMonthCount, setApprovedMonthCount] = useState(0);
  const [approvedMonthValue, setApprovedMonthValue] = useState(0);

  // Modal State
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [modalMode, setModalMode] = useState<'APPROVE' | 'REJECT' | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Secure RBAC: Redirect if not ADMIN or PROCUREMENT_MANAGER
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!isAuthLoading && user) {
      if (user.role !== Role.ADMIN && user.role !== 'PROCUREMENT_MANAGER') {
        router.push('/');
        toast.error('Unauthorized access');
      }
    }
  }, [user, isAuthenticated, isAuthLoading, router]);

  useEffect(() => {
    if (isAuthenticated && user && (user.role === Role.ADMIN || user.role === 'PROCUREMENT_MANAGER')) {
      loadPurchaseOrders();
    }
  // eslint-disable-next-hooks/exhaustive-deps
  }, [isAuthenticated, user, debouncedSearch, statusFilter, page]);

  useEffect(() => {
    if (isAuthenticated && user && (user.role === Role.ADMIN || user.role === 'PROCUREMENT_MANAGER')) {
      loadSummaryStats();
    }
  // eslint-disable-next-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  const loadPurchaseOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (statusFilter && statusFilter !== 'ALL') params.set('status', statusFilter);
      params.set('page', page.toString());
      params.set('pageSize', '20');

      // Assume the GET API uses the pattern /stores/purchase-orders
      const response = await apiClient.request<POResponse>(`/stores/purchase-orders?${params}`);
      
      if (response.success) {
        setOrders(response.data.data);
        setTotalCount(response.data.pagination.totalCount);
        setTotalPages(response.data.pagination.totalPages);
      }
    } catch {
      toast.error('Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const loadSummaryStats = async () => {
    try {
      // Fetch Pending Count
      const pendingRes = await apiClient.request<POResponse>('/stores/purchase-orders?status=SUBMITTED&limit=1');
      if (pendingRes.success) setPendingCount(pendingRes.data.pagination.totalCount);

      // Fetch Approved this month
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
      
      const approvedRes = await apiClient.request<POResponse>(
        `/stores/purchase-orders?status=APPROVED&fromDate=${firstDay}&toDate=${lastDay}&pageSize=1000`
      );
      if (approvedRes.success) {
        const approvedOrders = approvedRes.data.data;
        setApprovedMonthCount(approvedOrders.length);
        setApprovedMonthValue(approvedOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0));
      }
    } catch (e) {
      console.error('Failed to load PO stats', e);
    }
  };

  const handleModalConfirm = () => {
    setSelectedPo(null);
    setModalMode(null);
    loadPurchaseOrders();
    loadSummaryStats();
  };

  const formatUser = (u: PurchaseOrder['created_by']) => {
    if (!u) return 'System';
    return u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email.split('@')[0];
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT': return <Badge className="bg-slate-500 hover:bg-slate-600">Draft</Badge>;
      case 'SUBMITTED': return <Badge className="bg-amber-500 hover:bg-amber-600">Awaiting Approval</Badge>;
      case 'APPROVED': return <Badge className="bg-blue-500 hover:bg-blue-600">Approved</Badge>;
      case 'PARTIALLY_RECEIVED': return <Badge className="bg-purple-500 hover:bg-purple-600">Partially Received</Badge>;
      case 'FULLY_RECEIVED': return <Badge className="bg-emerald-500 hover:bg-emerald-600">Received</Badge>;
      case 'CANCELLED': return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isAuthLoading) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground">Authenticating...</div>;
  }

  if (!isAuthenticated || (user?.role !== Role.ADMIN && user?.role !== 'PROCUREMENT_MANAGER')) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Top Banner metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Awaiting Approval</CardTitle>
            <ClipboardList className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Purchase orders pending review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved This Month</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedMonthCount}</div>
            <p className="text-xs text-muted-foreground">Total approved orders via workflow</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Value (MTD)</CardTitle>
            <Wallet className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KES {approvedMonthValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Current month financial commitment</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search PO number or vendor..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                />
              </div>
              <select
                className="flex h-10 w-48 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Awaiting Approval (Submitted)</option>
                <option value="APPROVED">Approved</option>
                <option value="PARTIALLY_RECEIVED">Partially Received</option>
                <option value="FULLY_RECEIVED">Fully Received</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <Button variant="outline" size="sm" onClick={loadPurchaseOrders} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && orders.length === 0 ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col justify-center items-center py-10 text-center">
              <FileText className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No purchase orders found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your filters or search query.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Ordered By</TableHead>
                    <TableHead>Submitted Date</TableHead>
                    <TableHead className="text-right">Total Amount (KES)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-mono font-medium">{po.po_number}</TableCell>
                      <TableCell>{po.vendor?.name || 'Unknown Vendor'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatUser(po.created_by)}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(po.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {Number(po.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>{getStatusBadge(po.status)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => { /* View interaction next task */ }}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {po.status === 'SUBMITTED' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-emerald-600 focus:text-emerald-700 cursor-pointer" onClick={() => { setSelectedPo(po); setModalMode('APPROVE'); }}>
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600 focus:text-red-700 cursor-pointer" onClick={() => { setSelectedPo(po); setModalMode('REJECT'); }}>
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Reject
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination Component matched to existing layout behavior */}
          {totalPages > 0 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                Showing {orders.length} of {totalCount} results
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>
                  Previous
                </Button>
                <div className="text-sm text-muted-foreground mx-2">
                  Page {page} of {totalPages}
                </div>
                <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ApprovePOModal 
        isOpen={!!modalMode} 
        mode={modalMode} 
        po={selectedPo ? {
          id: selectedPo.id,
          po_number: selectedPo.po_number,
          vendor_name: selectedPo.vendor?.name || 'Unknown Vendor',
          total_amount: Number(selectedPo.total_amount),
          line_items_count: selectedPo.items?.length || 0,
          ordered_by: formatUser(selectedPo.created_by),
          submitted_at: selectedPo.created_at
        } : null}
        onConfirm={handleModalConfirm}
        onClose={() => { setSelectedPo(null); setModalMode(null); }}
      />
    </div>
  );
}

export default function AdminPurchaseOrdersPage() {
  return (
    <Suspense fallback={<div className="flex h-[400px] items-center justify-center"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
      <PurchaseOrdersContent />
    </Suspense>
  );
}
