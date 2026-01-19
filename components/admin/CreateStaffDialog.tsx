'use client';

/**
 * Create Staff Dialog
 * 
 * Modal dialog for creating new staff accounts.
 */

import { useState } from 'react';
import { adminApi } from '@/lib/api/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { RegisterUserDto } from '@/application/dtos/RegisterUserDto';
import { Role } from '@/domain/enums/Role';

interface CreateStaffDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateStaffDialog({ open, onClose, onSuccess }: CreateStaffDialogProps) {
  const [formData, setFormData] = useState<Partial<RegisterUserDto>>({
    id: crypto.randomUUID(),
    email: '',
    password: '',
    role: Role.DOCTOR,
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password || !formData.role) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const dto: RegisterUserDto = {
        id: formData.id!,
        email: formData.email!,
        password: formData.password!,
        role: formData.role!,
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
        phone: formData.phone || undefined,
      };

      const response = await adminApi.createStaff(dto);

      if (response.success && response.data) {
        toast.success('Staff member created successfully');
        onSuccess();
        // Reset form
        setFormData({
          id: crypto.randomUUID(),
          email: '',
          password: '',
          role: Role.DOCTOR,
          firstName: '',
          lastName: '',
          phone: '',
        });
      } else if (!response.success) {
        toast.error(response.error || 'Failed to create staff member');
      } else {
        toast.error('Failed to create staff member');
      }
    } catch (error) {
      toast.error('An error occurred while creating staff member');
      console.error('Error creating staff member:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Staff Member</DialogTitle>
          <DialogDescription>Add a new staff member to the system</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName || ''}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName || ''}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                required
                disabled={isSubmitting}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value={Role.DOCTOR}>Doctor</option>
                <option value={Role.NURSE}>Nurse</option>
                <option value={Role.FRONTDESK}>Frontdesk</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={isSubmitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Staff'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
