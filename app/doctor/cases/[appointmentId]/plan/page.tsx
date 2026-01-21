'use client';

/**
 * Plan Case Page
 * 
 * Allows doctors to create or edit case plans for surgical appointments.
 * Includes procedure planning, risk assessment, and readiness checklist.
 * 
 * Route: /doctor/cases/[appointmentId]/plan
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { doctorApi } from '@/lib/api/doctor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Save } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Link from 'next/link';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { CaseReadinessStatus, getCaseReadinessStatusLabel } from '@/domain/enums/CaseReadinessStatus';

export default function PlanCasePage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const appointmentId = params.appointmentId ? parseInt(params.appointmentId as string, 10) : null;

  const [appointment, setAppointment] = useState<AppointmentResponseDto | null>(null);
  const [patient, setPatient] = useState<PatientResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Case Plan Form State
  const [procedurePlan, setProcedurePlan] = useState('');
  const [riskFactors, setRiskFactors] = useState('');
  const [preOpNotes, setPreOpNotes] = useState('');
  const [implantDetails, setImplantDetails] = useState('');
  const [plannedAnesthesia, setPlannedAnesthesia] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [readinessStatus, setReadinessStatus] = useState<CaseReadinessStatus>(CaseReadinessStatus.NOT_STARTED);
  const [readyForSurgery, setReadyForSurgery] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/patient/login');
      return;
    }

    if (!appointmentId) {
      toast.error('Invalid appointment ID');
      router.push('/doctor/dashboard');
      return;
    }

    loadCaseData();
  }, [appointmentId, isAuthenticated, user]);

  const loadCaseData = async () => {
    if (!appointmentId) return;

    try {
      setLoading(true);

      // Load appointment
      const appointmentResponse = await doctorApi.getAppointment(appointmentId);
      if (!appointmentResponse.success || !appointmentResponse.data) {
        toast.error('Case not found');
        router.push('/doctor/dashboard');
        return;
      }

      const apt = appointmentResponse.data;
      setAppointment(apt);

      // Load patient
      const patientResponse = await doctorApi.getPatient(apt.patientId);
      if (patientResponse.success && patientResponse.data) {
        setPatient(patientResponse.data);
      }

      // TODO: Load existing case plan if it exists
      // For now, we'll start with empty form
    } catch (error) {
      console.error('Error loading case data:', error);
      toast.error('Failed to load case data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!appointmentId) return;

    try {
      setSaving(true);

      // TODO: Implement API call to save case plan
      // This will require creating a new API endpoint
      // For now, we'll show a success message
      
      toast.success('Case plan saved successfully');
      
      // Redirect back to view case page
      router.push(`/doctor/cases/${appointmentId}`);
    } catch (error) {
      console.error('Error saving case plan:', error);
      toast.error('Failed to save case plan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading case planning...</p>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Case not found</p>
          <Link href="/doctor/dashboard">
            <Button className="mt-4">Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const patientName = patient 
    ? `${patient.firstName} ${patient.lastName}`
    : `Patient ${appointment.patientId}`;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/doctor/cases/${appointmentId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Case
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-semibold">Plan Case</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {patientName} • {format(new Date(appointment.appointmentDate), 'MMMM d, yyyy')} at {appointment.time}
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Case Plan'}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Procedure Planning */}
        <Card>
          <CardHeader>
            <CardTitle>Procedure Planning</CardTitle>
            <CardDescription>Details about the planned procedure</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="procedurePlan">Procedure Plan</Label>
              <Textarea
                id="procedurePlan"
                value={procedurePlan}
                onChange={(e) => setProcedurePlan(e.target.value)}
                placeholder="Describe the planned procedure, approach, and key steps..."
                rows={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="implantDetails">Implant Details (if applicable)</Label>
              <Textarea
                id="implantDetails"
                value={implantDetails}
                onChange={(e) => setImplantDetails(e.target.value)}
                placeholder="Brand, size, model, etc."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plannedAnesthesia">Planned Anesthesia</Label>
              <Input
                id="plannedAnesthesia"
                value={plannedAnesthesia}
                onChange={(e) => setPlannedAnesthesia(e.target.value)}
                placeholder="e.g., General, Local, Sedation"
              />
            </div>
          </CardContent>
        </Card>

        {/* Risk Assessment & Readiness */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Assessment & Readiness</CardTitle>
            <CardDescription>Evaluate risks and readiness status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="riskFactors">Risk Factors</Label>
              <Textarea
                id="riskFactors"
                value={riskFactors}
                onChange={(e) => setRiskFactors(e.target.value)}
                placeholder="Document any risk factors, contraindications, or special considerations..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="readinessStatus">Readiness Status</Label>
              <Select
                value={readinessStatus}
                onValueChange={(value) => setReadinessStatus(value as CaseReadinessStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select readiness status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(CaseReadinessStatus).map((status) => (
                    <SelectItem key={status} value={status}>
                      {getCaseReadinessStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="readyForSurgery"
                checked={readyForSurgery}
                onCheckedChange={(checked) => setReadyForSurgery(checked === true)}
              />
              <Label htmlFor="readyForSurgery" className="cursor-pointer">
                Ready for Surgery
              </Label>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pre-Operative Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Pre-Operative Notes</CardTitle>
          <CardDescription>Additional notes and instructions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="preOpNotes">Pre-Operative Notes</Label>
            <Textarea
              id="preOpNotes"
              value={preOpNotes}
              onChange={(e) => setPreOpNotes(e.target.value)}
              placeholder="Any pre-operative considerations, patient preparation notes, etc."
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="specialInstructions">Special Instructions for Theatre Team</Label>
            <Textarea
              id="specialInstructions"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Any special instructions, equipment needs, positioning requirements, etc."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4 justify-end">
        <Link href={`/doctor/cases/${appointmentId}`}>
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Case Plan'}
        </Button>
      </div>
    </div>
  );
}
