'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Building2, Search, RefreshCw, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';

interface Vendor {
  id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  is_active: boolean;
}

interface VendorsResponse {
  data: Vendor[];
  pagination: { page: number; pageSize: number; totalCount: number; totalPages: number };
}

function VendorsContent() {
  const { user, isAuthenticated } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formName, setFormName] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formKraPin, setFormKraPin] = useState('');
  const [formVatNumber, setFormVatNumber] = useState('');

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (isAuthenticated && user) loadVendors();
  }, [isAuthenticated, user, debouncedSearch, page]);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      params.set('page', page.toString());
      params.set('pageSize', '20');

      const response = await apiClient.request<VendorsResponse>(`/stores/vendors?${params}`);
      if (response.success) {
        setVendors(response.data.data);
        setTotalCount(response.data.pagination.totalCount);
        setTotalPages(response.data.pagination.totalPages);
      }
    } catch { toast.error('Failed to load vendors'); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!formName.trim()) { toast.error('Vendor name is required'); return; }
    setIsSubmitting(true);
    try {
      const response = await apiClient.request('/stores/vendors', {
        method: 'POST',
        body: JSON.stringify({
          name: formName,
          contactPerson: formContact || undefined,
          email: formEmail || undefined,
          phone: formPhone || undefined,
          address: formAddress || undefined,
          kraPin: formKraPin || undefined,
          vatNumber: formVatNumber || undefined,
        }),
      });
      if (!response.success) throw new Error(response.error || 'Failed');
      toast.success('Vendor created');
      setShowCreateDialog(false);
      resetForm();
      loadVendors();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create vendor');
    } finally { setIsSubmitting(false); }
  };

  const resetForm = () => { setFormName(''); setFormContact(''); setFormEmail(''); setFormPhone(''); setFormAddress(''); setFormKraPin(''); setFormVatNumber(''); };

  if (!isAuthenticated) return <div className="flex items-center justify-center h-screen"><p className="text-sm text-slate-400">Authenticating...</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vendors</h1>
          <p className="text-sm text-slate-500 mt-1">Manage supplier information and contacts</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Vendor
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <Input placeholder="Search vendors..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setPage(1); }} className="pl-8" />
            </div>
            <Button variant="outline" size="sm" onClick={loadVendors} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && vendors.length === 0 ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : vendors.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-900">No vendors found</p>
              <p className="text-xs text-slate-500 mt-1">Add your first vendor to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map(vendor => (
                  <TableRow key={vendor.id}>
                    <TableCell className="font-medium">{vendor.name}</TableCell>
                    <TableCell>{vendor.contact_person || '—'}</TableCell>
                    <TableCell>{vendor.email || '—'}</TableCell>
                    <TableCell>{vendor.phone || '—'}</TableCell>
                    <TableCell>
                      {vendor.is_active ? (
                        <Badge className="bg-emerald-100 text-emerald-700 text-xs">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
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

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Vendor</DialogTitle>
            <DialogDescription>Enter the vendor details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Vendor Name <span className="text-red-500">*</span></Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. MedSupply Kenya" />
            </div>
            <div className="space-y-2">
              <Label>Contact Person</Label>
              <Input value={formContact} onChange={e => setFormContact(e.target.value)} placeholder="Optional" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>KRA PIN</Label>
                <Input value={formKraPin} onChange={e => setFormKraPin(e.target.value)} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label>VAT Number</Label>
                <Input value={formVatNumber} onChange={e => setFormVatNumber(e.target.value)} placeholder="Optional" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create Vendor'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TheaterTechVendorsPage() {
  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>}>
      <VendorsContent />
    </Suspense>
  );
}
