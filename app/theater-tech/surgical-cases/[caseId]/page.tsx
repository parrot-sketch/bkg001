/**
 * Theater Tech Surgical Case Details Page
 * 
 * Route: /theater-tech/surgical-cases/[caseId]
 * 
 * Displays case details after planning is complete.
 */

import { getCurrentUser } from '@/lib/auth/server-auth';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Calendar, Stethoscope, FileText, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface PageProps {
  params: Promise<{ caseId: string }>;
}

export default async function TheaterTechCaseDetailPage({ params }: PageProps) {
  const { caseId } = await params;
  const user = await getCurrentUser();
  
  if (!user || (user.role !== 'THEATER_TECHNICIAN' && user.role !== 'ADMIN')) {
    redirect('/login');
  }

  const surgicalCase = await db.surgicalCase.findUnique({
    where: { id: caseId },
    include: {
      patient: true,
      primary_surgeon: { select: { id: true, name: true, specialization: true } },
      case_items: { include: { inventory_item: true } },
      case_plan: true,
      case_procedures: { include: { procedure: true } },
    }
  });

  if (!surgicalCase) {
    redirect('/theater-tech/surgical-cases');
  }

  // Parse surgeon_ids for display
  let selectedSurgeonNames: string[] = [];
  if (surgicalCase.surgeon_ids) {
    try {
      const surgeonIds = JSON.parse(surgicalCase.surgeon_ids) as string[];
      const surgeons = await db.doctor.findMany({
        where: { id: { in: surgeonIds } },
        select: { name: true }
      });
      selectedSurgeonNames = surgeons.map(s => s.name);
    } catch (e) {
      if (surgicalCase.primary_surgeon) {
        selectedSurgeonNames = [surgicalCase.primary_surgeon.name];
      }
    }
  } else if (surgicalCase.primary_surgeon) {
    selectedSurgeonNames = [surgicalCase.primary_surgeon.name];
  }

  const isEditable = surgicalCase.status === 'DRAFT' || surgicalCase.status === 'PLANNING';

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Back button */}
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link href="/theater-tech/surgical-cases" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Surgical Cases
            </Link>
          </Button>
        </div>
        
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">
                Surgical Case
              </h1>
              <Badge className={
                surgicalCase.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                surgicalCase.status === 'CANCELLED' ? 'bg-gray-100 text-gray-700' :
                'bg-blue-100 text-blue-700'
              }>
                {surgicalCase.status}
              </Badge>
            </div>
            <p className="text-slate-500">
              {surgicalCase.patient.first_name} {surgicalCase.patient.last_name}
              {surgicalCase.patient.file_number && ` (${surgicalCase.patient.file_number})`}
            </p>
          </div>
          {isEditable && (
            <Link href={`/theater-tech/surgical-cases/${caseId}/edit`}>
              <Button>
                <FileText className="h-4 w-4 mr-2" />
                Continue Planning
              </Button>
            </Link>
          )}
        </div>

        {/* Case Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Case Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500 uppercase">Patient</p>
                  <p className="font-medium">
                    {surgicalCase.patient.first_name} {surgicalCase.patient.last_name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500 uppercase">File Number</p>
                  <p className="font-medium">{surgicalCase.patient.file_number || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Stethoscope className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500 uppercase">Surgeons</p>
                  <p className="font-medium">
                    {selectedSurgeonNames.length > 0 ? selectedSurgeonNames.join(', ') : 'Not assigned'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500 uppercase">Procedure Date</p>
                  <p className="font-medium">
                    {surgicalCase.procedure_date 
                      ? format(new Date(surgicalCase.procedure_date), 'MMM d, yyyy')
                      : 'Not scheduled'}
                  </p>
                </div>
              </div>
            </div>

            {surgicalCase.case_procedures.length > 0 && (
              <div className="border-t pt-4">
                <p className="text-xs text-slate-500 uppercase mb-2">Procedures</p>
                <div className="space-y-1">
                  {surgicalCase.case_procedures.map(cp => (
                    <p key={cp.id} className="font-medium">{cp.procedure.name}</p>
                  ))}
                </div>
              </div>
            )}

            {surgicalCase.procedure_category && (
              <div className="border-t pt-4">
                <p className="text-xs text-slate-500 uppercase mb-2">Procedure Category</p>
                <p className="font-medium">{surgicalCase.procedure_category}</p>
              </div>
            )}

            {surgicalCase.diagnosis && (
              <div className="border-t pt-4">
                <p className="text-xs text-slate-500 uppercase mb-2">Diagnosis</p>
                <p className="font-medium">{surgicalCase.diagnosis}</p>
              </div>
            )}

            {surgicalCase.primary_or_revision && (
              <div className="border-t pt-4">
                <p className="text-xs text-slate-500 uppercase mb-2">Case Type</p>
                <p className="font-medium">{surgicalCase.primary_or_revision === 'PRIMARY' ? 'Primary' : 'Revision'}</p>
              </div>
            )}

            {surgicalCase.anaesthesia_type && (
              <div className="border-t pt-4">
                <p className="text-xs text-slate-500 uppercase mb-2">Anaesthesia Type</p>
                <p className="font-medium">
                  {surgicalCase.anaesthesia_type === 'GENERAL' ? 'General' :
                   surgicalCase.anaesthesia_type === 'LOCAL' ? 'Local' :
                   surgicalCase.anaesthesia_type === 'REGIONAL' ? 'Regional' : 
                   surgicalCase.anaesthesia_type}
                </p>
              </div>
            )}

            {(surgicalCase.skin_to_skin_minutes || surgicalCase.total_theatre_minutes) && (
              <div className="border-t pt-4">
                <p className="text-xs text-slate-500 uppercase mb-2">Theater Times</p>
                <div className="grid grid-cols-2 gap-4">
                  {surgicalCase.skin_to_skin_minutes && (
                    <div>
                      <p className="text-sm text-slate-500">Skin to Skin</p>
                      <p className="font-medium">{surgicalCase.skin_to_skin_minutes} minutes</p>
                    </div>
                  )}
                  {surgicalCase.total_theatre_minutes && (
                    <div>
                      <p className="text-sm text-slate-500">Total Theatre Time</p>
                      <p className="font-medium">{surgicalCase.total_theatre_minutes} minutes</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {surgicalCase.admission_type && (
              <div className="border-t pt-4">
                <p className="text-xs text-slate-500 uppercase mb-2">Admission Type</p>
                <p className="font-medium">
                  {surgicalCase.admission_type === 'DAYCASE' ? 'Daycase' : 
                   surgicalCase.admission_type === 'OVERNIGHT' ? 'Overnight' : 
                   surgicalCase.admission_type}
                </p>
              </div>
            )}

            {surgicalCase.device_used && (
              <div className="border-t pt-4">
                <p className="text-xs text-slate-500 uppercase mb-2">Lipo Device</p>
                <p className="font-medium">
                  {surgicalCase.device_used === 'POWER_ASSISTED' ? 'Power Assisted' :
                   surgicalCase.device_used === 'LASER_ASSISTED' ? 'Laser Assisted' :
                   surgicalCase.device_used === 'SUCTION_ASSISTED' ? 'Suction Assisted' : 
                   surgicalCase.device_used}
                </p>
              </div>
            )}

            <div className="border-t pt-4">
              <p className="text-xs text-slate-500 uppercase mb-2">Urgency</p>
              <p className="font-medium">{surgicalCase.urgency}</p>
            </div>

            {surgicalCase.case_items.length > 0 && (
              <div className="border-t pt-4">
                <p className="text-xs text-slate-500 uppercase mb-2 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Theater Items ({surgicalCase.case_items.length})
                </p>
                <div className="space-y-2">
                  {surgicalCase.case_items.map(item => (
                    <div key={item.id} className="flex justify-between p-2 bg-slate-50 rounded">
                      <span>{item.inventory_item.name}</span>
                      <span className="text-slate-500">x{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}