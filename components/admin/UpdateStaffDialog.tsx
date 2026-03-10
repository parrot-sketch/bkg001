'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useUpdateStaff } from '@/hooks/staff/useStaff';
import type { UserResponseDto } from '@/application/dtos/UserResponseDto';
import type { CreateStaffDto } from '@/application/dtos/CreateStaffDto';
import { Role } from '@/domain/enums/Role';

interface UpdateStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  staff: UserResponseDto;
}

export function UpdateStaffDialog({ open, onOpenChange, onSuccess, staff }: UpdateStaffDialogProps) {
  const [formData, setFormData] = useState<Partial<CreateStaffDto>>({
    email: staff.email,
    role: staff.role,
    firstName: staff.firstName || '',
    lastName: staff.lastName || '',
    phone: staff.phone || '',
    password: '',
  });

  useEffect(() => {
    if (open) {
      setFormData({
        email: staff.email,
        role: staff.role,
        firstName: staff.firstName || '',
        lastName: staff.lastName || '',
        phone: staff.phone || '',
        password: '',
      });
    }
  }, [open, staff]);

  const updateMutation = useUpdateStaff();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.role) {
      toast.error('Email and role are required');
      return;
    }
    const updates: Partial<CreateStaffDto> = {
      email: formData.email,
      role: formData.role,
      firstName: formData.firstName || undefined,
      lastName: formData.lastName || undefined,
      phone: formData.phone || undefined,
    };
    if (formData.password?.trim()) updates.password = formData.password;

    try {
      await updateMutation.mutateAsync({ id: staff.id, updates });
      toast.success('Staff profile updated');
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update staff member');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
        <div className="h-1.5 w-full bg-indigo-600" />
        <div className="p-8">
          <DialogHeader className="pb-6">
            <DialogTitle className="text-2xl font-bold text-slate-900">Edit Staff Profile</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              Update institutional account details for {staff.firstName || staff.email}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">First Name</Label>
                <Input
                  className="rounded-xl border-slate-200 bg-slate-50/50"
                  value={formData.firstName || ''}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  disabled={updateMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Last Name</Label>
                <Input
                  className="rounded-xl border-slate-200 bg-slate-50/50"
                  value={formData.lastName || ''}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  disabled={updateMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address *</Label>
                <Input
                  type="email"
                  className="rounded-xl border-slate-200 bg-slate-50/50"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={updateMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</Label>
                <Input
                  type="tel"
                  className="rounded-xl border-slate-200 bg-slate-50/50"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={updateMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Institutional Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(val) => setFormData({ ...formData, role: val as Role })}
                  disabled={updateMutation.isPending}
                >
                  <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-10">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value={Role.DOCTOR} className="rounded-lg">Surgeon / Doctor</SelectItem>
                    <SelectItem value={Role.NURSE} className="rounded-lg">Clinical Nurse</SelectItem>
                    <SelectItem value={Role.FRONTDESK} className="rounded-lg">Frontdesk / Coordinator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  New Password <span className="font-medium text-slate-400 normal-case">(leave blank to keep)</span>
                </Label>
                <Input
                  type="password"
                  className="rounded-xl border-slate-200 bg-slate-50/50"
                  placeholder="Enter new password to change"
                  value={formData.password || ''}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  disabled={updateMutation.isPending}
                />
              </div>
            </div>

            <DialogFooter className="mt-8 gap-3 border-t border-slate-100 pt-6">
              <Button
                type="button" variant="ghost" onClick={() => onOpenChange(false)}
                disabled={updateMutation.isPending}
                className="rounded-xl font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-8 font-bold shadow-lg shadow-indigo-600/10"
              >
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
