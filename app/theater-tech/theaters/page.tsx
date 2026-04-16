'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertCircle, Loader2, MoreHorizontal, Search } from 'lucide-react';

import { theaterTechTheaterApi } from '@/lib/api/theater-tech/theaters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Reuse the admin theater components to keep the design language identical.
import { Theater, TheaterFormData, TheaterType, EMPTY_FORM } from '@/app/admin/theaters/_components/types';
import { TheaterDetailDialog } from '@/app/admin/theaters/_components/TheaterDetailDialog';
import { TheaterFormDialog } from '@/app/admin/theaters/_components/TheaterFormDialog';
import { TheaterDeleteDialog } from '@/app/admin/theaters/_components/TheaterDeleteDialog';

function toTheaterType(value: string): TheaterType {
  if (value === 'MAJOR' || value === 'MINOR' || value === 'PROCEDURE_ROOM') return value;
  return 'MAJOR';
}

function formatKsh(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(Math.round(amount || 0));
}

function hourlyToPerMinute(hourlyRate: number): number {
  return Math.round((hourlyRate || 0) / 60);
}

export default function TheaterTechTheatersPage() {
  const queryClient = useQueryClient();

  const [selectedTheater, setSelectedTheater] = useState<Theater | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [formData, setFormData] = useState<TheaterFormData>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['theater-tech', 'theaters'],
    queryFn: async () => {
      const res = await theaterTechTheaterApi.getAll();
      if (!res.success) throw new Error(res.error || 'Failed to load theaters');
      return res.data ?? [];
    },
  });

  const theaters = React.useMemo(() => (Array.isArray(data) ? data : []), [data]) as Theater[];
  const filtered = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return theaters;
    return theaters.filter((t) => {
      const name = (t.name || '').toLowerCase();
      const type = (t.type || '').toLowerCase();
      return name.includes(q) || type.includes(q);
    });
  }, [theaters, searchQuery]);

  const createMutation = useMutation({
    mutationFn: (payload: TheaterFormData) => theaterTechTheaterApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theater-tech', 'theaters'] });
      toast.success('Theater commissioned successfully');
      setIsFormOpen(false);
    },
    onError: () => toast.error('Failed to commission theater'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TheaterFormData | Partial<Theater> }) =>
      theaterTechTheaterApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theater-tech', 'theaters'] });
      toast.success('Theater configuration updated');
      setIsFormOpen(false);
    },
    onError: () => toast.error('Failed to update theater'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => theaterTechTheaterApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theater-tech', 'theaters'] });
      toast.success('Theater decommissioned');
      setIsDeleteOpen(false);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'Failed to decommission theater';
      toast.error(msg);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      theaterTechTheaterApi.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theater-tech', 'theaters'] });
      toast.success('Theater status updated');
    },
  });

  const handleAdd = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const handleEdit = (theater: Theater) => {
    setEditingId(theater.id);
    setFormData({
      name: theater.name,
      type: toTheaterType(theater.type),
      color_code: theater.color_code || '',
      notes: theater.notes || '',
      operational_hours: theater.operational_hours || '',
      capabilities: theater.capabilities || '',
      rate_per_minute: Math.round((theater.hourly_rate || 0) / 60),
    });
    setIsFormOpen(true);
  };

  const handleSave = () => {
    if (!formData.name) return toast.error('Name is required');
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <p className="text-sm font-medium text-muted-foreground">Loading theaters…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4 max-w-md mx-auto text-center">
        <div className="h-16 w-16 bg-rose-50 rounded-2xl flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-rose-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Infrastructure Connection Failure</h3>
        <p className="text-sm text-slate-500 font-medium">
          We encountered a synchronization error while retrieving theater data. Please check your connection and try
          again.
        </p>
        <Button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['theater-tech', 'theaters'] })}
          variant="outline"
          className="mt-4 rounded-xl font-bold"
        >
          Retry Connection
        </Button>
      </div>
    );
  }

  const stats = {
    total: theaters.length,
    active: theaters.filter((t) => t.is_active).length,
    bookedToday: theaters.reduce((sum, t) => sum + (t.bookings?.length ?? 0), 0),
    lifetime: theaters.reduce((sum, t) => sum + (t._count?.surgical_records ?? 0), 0),
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Theaters</h1>
          <p className="text-sm text-muted-foreground">
            Manage operating suites, availability, and per-minute pricing used for theater fee billing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleAdd} className="bg-slate-900 text-white hover:bg-slate-800">
            Add Theater
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-white p-3">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Total</div>
          <div className="mt-1 text-lg font-semibold">{stats.total}</div>
        </div>
        <div className="rounded-xl border bg-white p-3">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Active</div>
          <div className="mt-1 text-lg font-semibold">{stats.active}</div>
        </div>
        <div className="rounded-xl border bg-white p-3">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Booked Today</div>
          <div className="mt-1 text-lg font-semibold">{stats.bookedToday}</div>
        </div>
        <div className="rounded-xl border bg-white p-3">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Lifetime</div>
          <div className="mt-1 text-lg font-semibold">{stats.lifetime}</div>
        </div>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100 bg-slate-50/70">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-medium">Suites</CardTitle>
              <p className="text-xs text-muted-foreground">Compact operational view for quick edits and status toggles.</p>
            </div>
            <div className="relative w-full sm:w-[320px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name or type…"
                className="pl-9 bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-medium text-slate-900">No theaters found</p>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or add a new theater.</p>
              <Button onClick={handleAdd} className="mt-4 bg-slate-900 text-white hover:bg-slate-800">
                Add Theater
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-white">
                <TableRow>
                  <TableHead>Theater</TableHead>
                  <TableHead className="hidden md:table-cell">Rate</TableHead>
                  <TableHead className="hidden lg:table-cell">Today</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => {
                  const perMin = hourlyToPerMinute(t.hourly_rate || 0);
                  const todayCount = t.bookings?.length ?? 0;
                  const isActive = !!t.is_active;

                  return (
                    <TableRow key={t.id} className="hover:bg-slate-50/50">
                      <TableCell className="py-3">
                        <div className="min-w-0">
                          <button
                            type="button"
                            className="text-left w-full"
                            onClick={() => {
                              setSelectedTheater(t);
                              setIsDetailOpen(true);
                            }}
                          >
                            <div className="font-medium text-slate-900 truncate">{t.name}</div>
                            <div className="mt-0.5 text-xs text-muted-foreground flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px]">
                                {t.type}
                              </Badge>
                              <span className="font-mono">{formatKsh(perMin)}/min</span>
                              <span className="hidden sm:inline text-slate-300">·</span>
                              <span className="hidden sm:inline font-mono text-muted-foreground">
                                {formatKsh(t.hourly_rate || 0)}/hr
                              </span>
                            </div>
                          </button>
                        </div>
                      </TableCell>

                      <TableCell className="hidden md:table-cell py-3">
                        <div className="text-sm font-mono text-slate-900">{formatKsh(perMin)}/min</div>
                        <div className="text-xs text-muted-foreground font-mono">{formatKsh(t.hourly_rate || 0)}/hr</div>
                      </TableCell>

                      <TableCell className="hidden lg:table-cell py-3">
                        <div className="text-sm text-slate-900">{todayCount}</div>
                        <div className="text-xs text-muted-foreground">cases booked today</div>
                      </TableCell>

                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={isActive}
                            onCheckedChange={() => toggleMutation.mutate({ id: t.id, is_active: !isActive })}
                            className="data-[state=checked]:bg-emerald-600"
                          />
                          {isActive ? (
                            <span className="text-xs text-slate-700">Active</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Inactive</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedTheater(t);
                                setIsDetailOpen(true);
                              }}
                            >
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(t)}>Edit</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedTheater(t);
                                setIsDeleteOpen(true);
                              }}
                              className="text-red-600 focus:text-red-600"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TheaterDetailDialog open={isDetailOpen} onOpenChange={setIsDetailOpen} theater={selectedTheater} />

      <TheaterFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        formData={formData}
        setFormData={setFormData}
        isEditing={!!editingId}
        saving={createMutation.isPending || updateMutation.isPending}
        onSave={handleSave}
      />

      <TheaterDeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        theater={selectedTheater}
        saving={deleteMutation.isPending}
        onDelete={() => selectedTheater && deleteMutation.mutate(selectedTheater.id)}
      />
    </div>
  );
}
