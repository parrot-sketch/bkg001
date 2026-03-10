'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, AlertCircle } from 'lucide-react';
import { theaterApi } from '@/lib/api/theaters';
import { Theater, TheaterFormData, EMPTY_FORM } from './_components/types';
import { TheaterHeader } from './_components/TheaterHeader';
import { TheaterStats } from './_components/TheaterStats';
import { TheaterCard } from './_components/TheaterCard';
import { TheaterDetailDialog } from './_components/TheaterDetailDialog';
import { TheaterFormDialog } from './_components/TheaterFormDialog';
import { TheaterDeleteDialog } from './_components/TheaterDeleteDialog';
import { Button } from '@/components/ui/button';
import { BookTheaterSlotDialog } from '@/components/admin/theaters/BookTheaterSlotDialog';

export default function AdministrativeTheatersPage() {
  const queryClient = useQueryClient();
  
  // -- State Hooks --
  const [selectedTheater, setSelectedTheater] = useState<Theater | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [formData, setFormData] = useState<TheaterFormData>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  // -- Queries --
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['admin', 'theaters'],
    queryFn: async () => {
      const res = await theaterApi.getAll();
      return Array.isArray(res) ? res : res.success ? res.data || [] : [];
    },
  });
  
  const theaters = React.useMemo(() => Array.isArray(data) ? data : [], [data]) as Theater[];

  // -- Mutations --
  const createMutation = useMutation({
    mutationFn: (data: TheaterFormData) => theaterApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'theaters'] });
      toast.success('Theater commissioned successfully');
      setIsFormOpen(false);
    },
    onError: () => toast.error('Failed to commission theater'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Theater> }) => 
      theaterApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'theaters'] });
      toast.success('Theater configuration updated');
      setIsFormOpen(false);
    },
    onError: () => toast.error('Failed to update theater'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => theaterApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'theaters'] });
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
      theaterApi.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'theaters'] });
      toast.success('Theater status updated');
    },
  });

  // -- Handlers --
  const handleAdd = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const handleEdit = (theater: Theater) => {
    setEditingId(theater.id);
    setFormData({
      name: theater.name,
      type: theater.type as any,
      color_code: theater.color_code || '#6366F1',
      notes: theater.notes || '',
      operational_hours: theater.operational_hours || '',
      capabilities: theater.capabilities || '',
    });
    setIsFormOpen(true);
  };

  const handleSave = () => {
    if (!formData.name) return toast.error('Name is required');
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Hydrating clinical assets...</p>
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
          We encountered a synchronization error while retrieving theater data. Please check your connection and try again.
        </p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['admin', 'theaters'] })} variant="outline" className="mt-4 rounded-xl font-bold">
            Retry Connection
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <TheaterHeader onAdd={handleAdd} />
      
      <TheaterStats theaters={theaters} />

      {theaters.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center text-center rounded-[3rem] bg-white border-2 border-dashed border-slate-100 shadow-sm">
            <div className="h-20 w-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6">
                <Loader2 className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">No Theaters Provisioned</h3>
            <p className="text-slate-500 max-w-sm mt-2 font-medium">
                Your clinical environment has no active theaters. Click &quot;Add Theater&quot; to begin building your infrastructure.
            </p>
            <Button onClick={handleAdd} className="mt-8 rounded-2xl bg-slate-900 px-8 font-bold shadow-xl shadow-slate-900/10">
                Provision First Suite
            </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {theaters.map((theater: Theater) => (
            <TheaterCard
              key={theater.id}
              theater={theater}
              onEdit={() => handleEdit(theater)}
              onDelete={() => {
                setSelectedTheater(theater);
                setIsDeleteOpen(true);
              }}
              onToggleActive={() => toggleMutation.mutate({ id: theater.id, is_active: !theater.is_active })}
              onViewDetail={() => {
                setSelectedTheater(theater);
                setIsDetailOpen(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <TheaterDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        theater={selectedTheater}
        onBookSlot={() => {
            setIsDetailOpen(false);
            setIsBookingOpen(true);
        }}
      />

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

      {selectedTheater && (
        <BookTheaterSlotDialog
          open={isBookingOpen}
          onOpenChange={setIsBookingOpen}
          theaterId={selectedTheater.id}
          theaterName={selectedTheater.name}
          onBookSuccess={() => {
            setIsBookingOpen(false);
            queryClient.invalidateQueries({ queryKey: ['admin', 'theaters'] });
            toast.success('Surgical slot booked successfully');
          }}
        />
      )}
    </div>
  );
}
