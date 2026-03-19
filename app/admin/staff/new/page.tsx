'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { useCreateStaff } from '@/hooks/staff/useStaff';
import type { CreateStaffDto } from '@/application/dtos/CreateStaffDto';
import { Role } from '@/domain/enums/Role';

const EMPTY_FORM: Partial<CreateStaffDto> = {
  email: '', password: '', role: Role.DOCTOR, firstName: '', lastName: '', phone: '',
};

export default function NewStaffPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<Partial<CreateStaffDto>>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const createMutation = useCreateStaff();

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.role) {
      toast.error('Email, password, and role are required');
      return;
    }
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }
    try {
      await createMutation.mutateAsync({
        email: formData.email!,
        password: formData.password!,
        role: formData.role!,
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
        phone: formData.phone || undefined,
      });
      toast.success('Staff member onboarded successfully');
      router.push('/admin/staff');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create staff member');
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <Button
        variant="ghost"
        onClick={() => router.push('/admin/dashboard')}
        className="mb-6 -ml-3 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl font-medium"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>

      <Card className="border-slate-200/60 shadow-sm rounded-3xl overflow-hidden">
        <div className="h-1.5 w-full bg-slate-900" />
        <CardHeader className="pb-6">
          <CardTitle className="text-2xl font-bold text-slate-900">Onboard Staff Member</CardTitle>
          <CardDescription className="text-slate-500 font-medium">
            Create a new institutional account. The staff member can change their password on first login.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">First Name</Label>
                <Input
                  className="rounded-xl border-slate-200 bg-slate-50/50"
                  placeholder="e.g. James"
                  value={formData.firstName || ''}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  disabled={createMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Last Name</Label>
                <Input
                  className="rounded-xl border-slate-200 bg-slate-50/50"
                  placeholder="e.g. Muthomi"
                  value={formData.lastName || ''}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  disabled={createMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address *</Label>
                <Input
                  type="email"
                  className="rounded-xl border-slate-200 bg-slate-50/50"
                  placeholder="staff@nairobisculpt.com"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={createMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</Label>
                <Input
                  type="tel"
                  className="rounded-xl border-slate-200 bg-slate-50/50"
                  placeholder="+254 7XX XXX XXX"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={createMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Institutional Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(val) => setFormData({ ...formData, role: val as Role })}
                  disabled={createMutation.isPending}
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
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Temporary Password *</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    className="rounded-xl border-slate-200 bg-slate-50/50 pr-10"
                    placeholder="Min. 8 characters"
                    value={formData.password || ''}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    disabled={createMutation.isPending}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-slate-400">Min. 8 characters, uppercase, lowercase, and number</p>
              </div>
            </div>

            <div className="mt-8 flex gap-3 justify-end border-t border-slate-100 pt-6">
              <Button
                type="button" variant="ghost" onClick={() => router.push('/admin/dashboard')}
                disabled={createMutation.isPending}
                className="rounded-xl font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-xl bg-slate-900 px-8 font-bold shadow-lg shadow-slate-900/10"
              >
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Onboard Staff
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
