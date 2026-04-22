'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface Service {
  id: number;
  service_name: string;
  description: string | null;
  price: number;
  category: string | null;
  is_active: boolean;
  price_type: string;
  min_price: number | null;
  max_price: number | null;
}

const SERVICE_CATEGORIES = [
  { value: 'Service', label: 'Service' },
  { value: 'Consultation', label: 'Consultation' },
  { value: 'Procedure', label: 'Procedure' },
  { value: 'Laboratory', label: 'Laboratory' },
  { value: 'Pharmacy', label: 'Pharmacy' },
];

export default function TheaterTechServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // AlertDialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [pendingName, setPendingName] = useState('');
  const [pendingIsActive, setPendingIsActive] = useState(true);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '15');
      if (searchQuery) params.set('search', searchQuery);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (statusFilter !== 'all') params.set('is_active', statusFilter === 'active' ? 'true' : 'false');

      const res = await fetch(`/api/admin/services?${params}`);
      const data = await res.json();

      if (data.success) {
        setServices(data.data || []);
        setTotalPages(data.pagination.totalPages);
        setTotalCount(data.pagination.totalCount);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, categoryFilter, statusFilter]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const openConfirm = (id: number, name: string, isActive: boolean) => {
    setPendingId(id);
    setPendingName(name);
    setPendingIsActive(isActive);
    setConfirmOpen(true);
  };

  const handleToggleActive = async () => {
    if (pendingId === null) return;
    try {
      const res = await fetch(`/api/admin/services/${pendingId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success(pendingIsActive ? 'Service deactivated' : 'Service activated');
        fetchServices();
      } else {
        toast.error(data.error || 'Failed to update service');
      }
    } catch {
      toast.error('Failed to update service');
    } finally {
      setConfirmOpen(false);
      setPendingId(null);
    }
  };

  const formatPrice = (service: Service) => {
    if (service.price_type === 'VARIABLE' && service.min_price && service.max_price) {
      return `KES ${service.min_price.toLocaleString()} – ${service.max_price.toLocaleString()}`;
    }
    return `KES ${service.price.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Services Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage clinic services and billing rates
          </p>
        </div>
        <Button asChild>
          <Link href="/theater-tech/services/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Link>
        </Button>
      </div>

      {/* Table Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle>Services</CardTitle>
              <CardDescription>
                {loading ? 'Loading...' : `${totalCount} service(s)`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search services..."
                  className="pl-9 h-9"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 w-[140px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {SERVICE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[120px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Service</span>
                </TableHead>
                <TableHead><span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</span></TableHead>
                <TableHead><span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Price Type</span></TableHead>
                <TableHead><span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Price</span></TableHead>
                <TableHead><span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</span></TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : services.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Stethoscope className="h-10 w-10 text-muted-foreground/40 mb-3" />
                      <p className="text-sm font-medium text-muted-foreground">
                        {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all'
                          ? 'No services match your filters'
                          : 'No services found. Click "Add Service" to create one.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium text-sm">{service.service_name}</p>
                        {service.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {service.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-normal">
                        {service.category || '—'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{service.price_type}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-slate-700">
                        {formatPrice(service)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={service.is_active ? 'default' : 'secondary'}
                        className={cn(
                          'text-xs font-normal border',
                          service.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-300'
                        )}
                      >
                        {service.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Open actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/theater-tech/services/${service.id}`}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => openConfirm(service.id, service.service_name, service.is_active)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {service.is_active ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deactivate/Activate Confirmation */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingIsActive ? 'Deactivate Service' : 'Activate Service'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingIsActive
                ? `"${pendingName}" will be hidden from billing and cannot be added to new charge sheets.`
                : `"${pendingName}" will become available again for billing.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={pendingIsActive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
              onClick={handleToggleActive}
            >
              {pendingIsActive ? 'Deactivate' : 'Activate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
