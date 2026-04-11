/**
 * Theater Tech Surgical Case Plan Document
 * 
 * Route: /theater-tech/surgical-cases/[caseId]/plan
 * 
 * Read-only document view of the surgical case plan.
 * Clean, printable format for theater tech reference.
 */

import { getCurrentUser } from '@/lib/auth/server-auth';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  Stethoscope, 
  FileText, 
  Package, 
  Clock,
  Activity,
  ChevronRight,
  DollarSign
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { TheaterTechBilling } from '@/components/theater-tech/TheaterTechBilling';

interface PageProps {
  params: Promise<{ caseId: string }>;
}

export default async function TheaterTechPlanDocumentPage({ params }: PageProps) {
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
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/theater-tech/surgical-cases" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Surgical Case Plan</h1>
              <p className="text-sm text-slate-500">Case ID: {caseId.slice(0, 8)}...</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={
              surgicalCase.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
              surgicalCase.status === 'PLANNING' ? 'bg-blue-100 text-blue-700' :
              'bg-slate-100 text-slate-700'
            }>
              {surgicalCase.status}
            </Badge>
            {isEditable && (
              <Button asChild>
                <Link href={`/theater-tech/surgical-cases/${caseId}/edit`}>
                  Continue Planning
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Patient Info */}
        <Card className="mb-6 border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wide">Patient Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-slate-400 mb-1">Name</p>
                <p className="font-medium text-slate-900">{surgicalCase.patient.first_name} {surgicalCase.patient.last_name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">File Number</p>
                <p className="font-medium text-slate-900">{surgicalCase.patient.file_number || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Date of Birth</p>
                <p className="font-medium text-slate-900">
                  {surgicalCase.patient.date_of_birth 
                    ? format(new Date(surgicalCase.patient.date_of_birth), 'MMM d, yyyy')
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Gender</p>
                <p className="font-medium text-slate-900">{surgicalCase.patient.gender || '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Procedure Details */}
        <Card className="mb-6 border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wide">Procedure Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6 mb-6">
              <div>
                <p className="text-xs text-slate-400 mb-1">Procedure Date</p>
                <p className="font-medium text-slate-900">
                  {surgicalCase.procedure_date 
                    ? format(new Date(surgicalCase.procedure_date), 'MMMM d, yyyy')
                    : 'Not scheduled'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Category</p>
                <p className="font-medium text-slate-900">{surgicalCase.procedure_category || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Case Type</p>
                <p className="font-medium text-slate-900">
                  {surgicalCase.primary_or_revision === 'PRIMARY' ? 'Primary' : 
                   surgicalCase.primary_or_revision === 'REVISION' ? 'Revision' : '—'}
                </p>
              </div>
            </div>

            {surgicalCase.case_procedures.length > 0 && (
              <div className="mb-6">
                <p className="text-xs text-slate-400 mb-2">Procedures</p>
                <div className="flex flex-wrap gap-2">
                  {surgicalCase.case_procedures.map(cp => (
                    <Badge key={cp.id} variant="outline" className="text-sm font-normal">
                      {cp.procedure.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs text-slate-400 mb-1">Diagnosis</p>
              <p className="text-slate-900">{surgicalCase.diagnosis || '—'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Surgical Team */}
        <Card className="mb-6 border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wide">Surgical Team</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {selectedSurgeonNames.length > 0 ? (
                selectedSurgeonNames.map((name, i) => (
                  <div key={i} className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-md">
                    <Stethoscope className="h-4 w-4 text-slate-500" />
                    <span className="font-medium text-slate-900">{name}</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-500">No surgeons assigned</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Operative Details */}
        {(surgicalCase.anaesthesia_type || surgicalCase.skin_to_skin_minutes || surgicalCase.total_theatre_minutes || surgicalCase.admission_type) && (
          <Card className="mb-6 border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wide">Operative Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-6">
                {surgicalCase.anaesthesia_type && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Anaesthesia</p>
                    <p className="font-medium text-slate-900">
                      {surgicalCase.anaesthesia_type === 'GENERAL' ? 'General' : 
                       surgicalCase.anaesthesia_type === 'LOCAL' ? 'Local' :
                       surgicalCase.anaesthesia_type === 'REGIONAL' ? 'Regional' : 
                       surgicalCase.anaesthesia_type}
                    </p>
                  </div>
                )}
                {surgicalCase.skin_to_skin_minutes && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Skin to Skin</p>
                    <p className="font-medium text-slate-900">{surgicalCase.skin_to_skin_minutes} min</p>
                  </div>
                )}
                {surgicalCase.total_theatre_minutes && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Total Theater Time</p>
                    <p className="font-medium text-slate-900">{surgicalCase.total_theatre_minutes} min</p>
                  </div>
                )}
                {surgicalCase.admission_type && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Admission</p>
                    <p className="font-medium text-slate-900">
                      {surgicalCase.admission_type === 'DAYCASE' ? 'Daycase' : 
                       surgicalCase.admission_type === 'OVERNIGHT' ? 'Overnight' : 
                       surgicalCase.admission_type}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Theater Items */}
        {surgicalCase.case_items.length > 0 && (
          <Card className="mb-6 border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                Theater Items ({surgicalCase.case_items.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left text-xs font-medium text-slate-500 py-2">Item</th>
                    <th className="text-right text-xs font-medium text-slate-500 py-2">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {surgicalCase.case_items.map(item => (
                    <tr key={item.id} className="border-b border-slate-50">
                      <td className="py-2 text-slate-900">{item.inventory_item.name}</td>
                      <td className="py-2 text-right text-slate-600">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Charge Sheet */}
        <div className="mb-6">
          <TheaterTechBilling caseId={caseId} />
        </div>

        {/* Metadata */}
        <div className="text-xs text-slate-400 border-t pt-4 mt-8">
          <div className="flex justify-between">
            <span>Created: {format(new Date(surgicalCase.created_at), 'MMM d, yyyy h:mm a')}</span>
            <span>Urgency: {surgicalCase.urgency}</span>
          </div>
        </div>
      </div>
    </div>
  );
}