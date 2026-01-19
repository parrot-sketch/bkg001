'use client';

/**
 * Admin: Invite Doctor Page
 * 
 * Allows admin/frontdesk to invite a doctor to the system.
 * Minimal, professional interface.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InviteDoctorDto } from '@/application/dtos/InviteDoctorDto';

export default function InviteDoctorPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<InviteDoctorDto>({
    email: '',
    firstName: '',
    lastName: '',
    specialization: '',
    licenseNumber: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof InviteDoctorDto, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate required fields
    const newErrors: Partial<Record<keyof InviteDoctorDto, string>> = {};
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';
    if (!formData.specialization) newErrors.specialization = 'Specialization is required';
    if (!formData.licenseNumber) newErrors.licenseNumber = 'License number is required';
    if (!formData.phone) newErrors.phone = 'Phone is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await adminApi.inviteDoctor(formData);

      if (response.success && response.data) {
        setSuccessEmail(formData.email);
        // Reset form
        setFormData({
          email: '',
          firstName: '',
          lastName: '',
          specialization: '',
          licenseNumber: '',
          phone: '',
        });
      } else if (!response.success) {
        setErrors({ email: response.error || 'Failed to send invitation' });
      } else {
        setErrors({ email: 'Failed to send invitation' });
      }
    } catch (error) {
      setErrors({ email: 'An error occurred while sending invitation' });
      console.error('Error inviting doctor:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInviteAnother = () => {
    setSuccessEmail(null);
  };

  if (successEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-700">
                Invitation sent to <span className="font-medium">{successEmail}</span>
              </p>
              <Button onClick={handleInviteAnother} variant="outline" className="w-full">
                Invite another doctor
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Invite Doctor</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={isSubmitting}
              />
              {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  disabled={isSubmitting}
                />
                {errors.firstName && <p className="text-sm text-red-600">{errors.firstName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  disabled={isSubmitting}
                />
                {errors.lastName && <p className="text-sm text-red-600">{errors.lastName}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialization">Specialization</Label>
              <Input
                id="specialization"
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                disabled={isSubmitting}
              />
              {errors.specialization && <p className="text-sm text-red-600">{errors.specialization}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="licenseNumber">License Number</Label>
              <Input
                id="licenseNumber"
                value={formData.licenseNumber}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                disabled={isSubmitting}
              />
              {errors.licenseNumber && <p className="text-sm text-red-600">{errors.licenseNumber}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={isSubmitting}
              />
              {errors.phone && <p className="text-sm text-red-600">{errors.phone}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
