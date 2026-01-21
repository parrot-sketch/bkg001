'use client';

/**
 * Edit Doctor Profile Dialog
 * 
 * Allows doctors to update their profile information.
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { doctorApi } from '@/lib/api/doctor';
import type { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';

interface EditDoctorProfileDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  doctor: DoctorResponseDto;
}

export function EditDoctorProfileDialog({
  open,
  onClose,
  onSuccess,
  doctor,
}: EditDoctorProfileDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    bio: doctor.bio || '',
    education: doctor.education || '',
    focusAreas: doctor.focusAreas || '',
    professionalAffiliations: doctor.professionalAffiliations || '',
    profileImage: doctor.profileImage || '',
    clinicLocation: doctor.clinicLocation || '',
    specialization: doctor.specialization || '',
  });

  useEffect(() => {
    if (open && doctor) {
      setFormData({
        bio: doctor.bio || '',
        education: doctor.education || '',
        focusAreas: doctor.focusAreas || '',
        professionalAffiliations: doctor.professionalAffiliations || '',
        profileImage: doctor.profileImage || '',
        clinicLocation: doctor.clinicLocation || '',
        specialization: doctor.specialization || '',
      });
    }
  }, [open, doctor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await doctorApi.updateProfile(formData);

      if (response.success) {
        toast.success('Profile updated successfully');
        onSuccess();
        onClose();
      } else {
        toast.error(response.error || 'Failed to update profile');
      }
    } catch (error) {
      toast.error('An error occurred while updating profile');
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your professional profile information
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="specialization">Specialization *</Label>
              <Input
                id="specialization"
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                placeholder="e.g., Plastic Surgery, Dermatology"
                required
              />
              <p className="text-xs text-muted-foreground">
                This affects how patients find you in search
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profileImage">Profile Image URL</Label>
              <Input
                id="profileImage"
                value={formData.profileImage}
                onChange={(e) => setFormData({ ...formData, profileImage: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clinicLocation">Clinic Location</Label>
            <Input
              id="clinicLocation"
              value={formData.clinicLocation}
              onChange={(e) => setFormData({ ...formData, clinicLocation: e.target.value })}
              placeholder="Clinic address or location"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Biography</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell us about yourself..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="education">Education</Label>
            <Textarea
              id="education"
              value={formData.education}
              onChange={(e) => setFormData({ ...formData, education: e.target.value })}
              placeholder="Your educational background and qualifications..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="focusAreas">Focus Areas</Label>
            <Textarea
              id="focusAreas"
              value={formData.focusAreas}
              onChange={(e) => setFormData({ ...formData, focusAreas: e.target.value })}
              placeholder="Areas of expertise and focus..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="professionalAffiliations">Professional Affiliations</Label>
            <Textarea
              id="professionalAffiliations"
              value={formData.professionalAffiliations}
              onChange={(e) => setFormData({ ...formData, professionalAffiliations: e.target.value })}
              placeholder="Professional memberships and affiliations..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
