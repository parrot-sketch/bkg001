'use client';

/**
 * Patient Registration Dialog
 * 
 * Modal dialog for registering a new patient.
 * Comprehensive form with all patient information fields.
 */

import { useState } from 'react';
import { frontdeskApi } from '../../lib/api/frontdesk';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { toast } from 'sonner';
import type { PatientResponseDto } from '../../application/dtos/PatientResponseDto';
import type { CreatePatientDto } from '../../application/dtos/CreatePatientDto';
import { Gender } from '../../domain/enums/Gender';

interface PatientRegistrationDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (patient: PatientResponseDto) => void;
  frontdeskUserId: string;
  existingPatient?: PatientResponseDto | null;
}

export function PatientRegistrationDialog({
  open,
  onClose,
  onSuccess,
  frontdeskUserId,
  existingPatient,
}: PatientRegistrationDialogProps) {
  const [formData, setFormData] = useState<Partial<CreatePatientDto>>({
    id: existingPatient?.id || '',
    firstName: existingPatient?.firstName || '',
    lastName: existingPatient?.lastName || '',
    dateOfBirth: existingPatient?.dateOfBirth
      ? new Date(existingPatient.dateOfBirth).toISOString().split('T')[0]
      : '',
    gender: existingPatient?.gender || Gender.MALE,
    email: existingPatient?.email || '',
    phone: existingPatient?.phone || '',
    address: existingPatient?.address || '',
    maritalStatus: existingPatient?.maritalStatus || '',
    emergencyContactName: existingPatient?.emergencyContactName || '',
    emergencyContactNumber: existingPatient?.emergencyContactNumber || '',
    relation: existingPatient?.relation || '',
    privacyConsent: existingPatient?.privacyConsent ?? false,
    serviceConsent: existingPatient?.serviceConsent ?? false,
    medicalConsent: existingPatient?.medicalConsent ?? false,
    bloodGroup: existingPatient?.bloodGroup || '',
    allergies: existingPatient?.allergies || '',
    medicalConditions: existingPatient?.medicalConditions || '',
    medicalHistory: existingPatient?.medicalHistory || '',
    insuranceProvider: existingPatient?.insuranceProvider || '',
    insuranceNumber: existingPatient?.insuranceNumber || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (
      !formData.id ||
      !formData.firstName ||
      !formData.lastName ||
      !formData.dateOfBirth ||
      !formData.email ||
      !formData.phone ||
      !formData.address ||
      !formData.maritalStatus ||
      !formData.emergencyContactName ||
      !formData.emergencyContactNumber ||
      !formData.relation
    ) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!formData.privacyConsent || !formData.serviceConsent || !formData.medicalConsent) {
      toast.error('All consent fields must be accepted');
      return;
    }

    setIsSubmitting(true);

    try {
      const dto: CreatePatientDto = {
        id: formData.id!,
        firstName: formData.firstName!,
        lastName: formData.lastName!,
        dateOfBirth: new Date(formData.dateOfBirth!),
        gender: formData.gender!,
        email: formData.email!,
        phone: formData.phone!,
        address: formData.address!,
        maritalStatus: formData.maritalStatus!,
        emergencyContactName: formData.emergencyContactName!,
        emergencyContactNumber: formData.emergencyContactNumber!,
        relation: formData.relation!,
        privacyConsent: formData.privacyConsent!,
        serviceConsent: formData.serviceConsent!,
        medicalConsent: formData.medicalConsent!,
        bloodGroup: formData.bloodGroup,
        allergies: formData.allergies,
        medicalConditions: formData.medicalConditions,
        medicalHistory: formData.medicalHistory,
        insuranceProvider: formData.insuranceProvider,
        insuranceNumber: formData.insuranceNumber,
      };

      const response = await frontdeskApi.createPatient(dto);

      if (response.success && response.data) {
        toast.success('Patient registered successfully');
        onSuccess(response.data);
        // Reset form
        setFormData({
          id: '',
          firstName: '',
          lastName: '',
          dateOfBirth: '',
          gender: Gender.MALE,
          email: '',
          phone: '',
          address: '',
          maritalStatus: '',
          emergencyContactName: '',
          emergencyContactNumber: '',
          relation: '',
          privacyConsent: false,
          serviceConsent: false,
          medicalConsent: false,
          bloodGroup: '',
          allergies: '',
          medicalConditions: '',
          medicalHistory: '',
          insuranceProvider: '',
          insuranceNumber: '',
        });
      } else {
        toast.error(response.error || 'Failed to register patient');
      }
    } catch (error) {
      toast.error('An error occurred while registering patient');
      console.error('Error registering patient:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existingPatient ? 'Update Patient' : 'Register New Patient'}</DialogTitle>
          <DialogDescription>
            {existingPatient
              ? 'Update patient information'
              : 'Fill in the details to register a new patient'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Personal Information */}
            <div className="space-y-4 border-b pb-4">
              <h3 className="text-sm font-semibold">Personal Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="id">Patient ID *</Label>
                  <Input
                    id="id"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    required
                    disabled={isSubmitting || !!existingPatient}
                    placeholder="Enter unique patient ID"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender *</Label>
                  <select
                    id="gender"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
                    required
                    disabled={isSubmitting}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value={Gender.MALE}>Male</option>
                    <option value={Gender.FEMALE}>Female</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    required
                    disabled={isSubmitting}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maritalStatus">Marital Status *</Label>
                  <Input
                    id="maritalStatus"
                    value={formData.maritalStatus}
                    onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                    required
                    disabled={isSubmitting}
                    placeholder="e.g., Single, Married"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4 border-b pb-4">
              <h3 className="text-sm font-semibold">Contact Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
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
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="space-y-4 border-b pb-4">
              <h3 className="text-sm font-semibold">Emergency Contact</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactName">Contact Name *</Label>
                  <Input
                    id="emergencyContactName"
                    value={formData.emergencyContactName}
                    onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyContactNumber">Contact Number *</Label>
                  <Input
                    id="emergencyContactNumber"
                    type="tel"
                    value={formData.emergencyContactNumber}
                    onChange={(e) => setFormData({ ...formData, emergencyContactNumber: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="relation">Relation *</Label>
                  <Input
                    id="relation"
                    value={formData.relation}
                    onChange={(e) => setFormData({ ...formData, relation: e.target.value })}
                    required
                    disabled={isSubmitting}
                    placeholder="e.g., Spouse, Parent, Sibling"
                  />
                </div>
              </div>
            </div>

            {/* Medical Information */}
            <div className="space-y-4 border-b pb-4">
              <h3 className="text-sm font-semibold">Medical Information (Optional)</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bloodGroup">Blood Group</Label>
                  <Input
                    id="bloodGroup"
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    disabled={isSubmitting}
                    placeholder="e.g., O+, A-, B+"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allergies">Allergies</Label>
                  <Input
                    id="allergies"
                    value={formData.allergies}
                    onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                    disabled={isSubmitting}
                    placeholder="e.g., Penicillin, Latex"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="medicalConditions">Medical Conditions</Label>
                  <Input
                    id="medicalConditions"
                    value={formData.medicalConditions}
                    onChange={(e) => setFormData({ ...formData, medicalConditions: e.target.value })}
                    disabled={isSubmitting}
                    placeholder="e.g., Diabetes, Hypertension"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="insuranceProvider">Insurance Provider</Label>
                  <Input
                    id="insuranceProvider"
                    value={formData.insuranceProvider}
                    onChange={(e) => setFormData({ ...formData, insuranceProvider: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="insuranceNumber">Insurance Number</Label>
                  <Input
                    id="insuranceNumber"
                    value={formData.insuranceNumber}
                    onChange={(e) => setFormData({ ...formData, insuranceNumber: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="medicalHistory">Medical History</Label>
                  <Textarea
                    id="medicalHistory"
                    value={formData.medicalHistory}
                    onChange={(e) => setFormData({ ...formData, medicalHistory: e.target.value })}
                    disabled={isSubmitting}
                    rows={4}
                    placeholder="Previous medical history, surgeries, etc."
                  />
                </div>
              </div>
            </div>

            {/* Consents */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Consents *</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="privacyConsent"
                    checked={formData.privacyConsent}
                    onChange={(e) => setFormData({ ...formData, privacyConsent: e.target.checked })}
                    disabled={isSubmitting}
                    className="h-4 w-4 rounded border-gray-300"
                    required
                  />
                  <Label htmlFor="privacyConsent" className="text-sm font-normal">
                    Privacy Consent *
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="serviceConsent"
                    checked={formData.serviceConsent}
                    onChange={(e) => setFormData({ ...formData, serviceConsent: e.target.checked })}
                    disabled={isSubmitting}
                    className="h-4 w-4 rounded border-gray-300"
                    required
                  />
                  <Label htmlFor="serviceConsent" className="text-sm font-normal">
                    Service Consent *
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="medicalConsent"
                    checked={formData.medicalConsent}
                    onChange={(e) => setFormData({ ...formData, medicalConsent: e.target.checked })}
                    disabled={isSubmitting}
                    className="h-4 w-4 rounded border-gray-300"
                    required
                  />
                  <Label htmlFor="medicalConsent" className="text-sm font-normal">
                    Medical Consent *
                  </Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Registering...' : existingPatient ? 'Update Patient' : 'Register Patient'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
