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
  Stethoscope, 
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';


function PlanPageSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-16 bg-slate-100 rounded-lg" />
      <div className="grid grid-cols-2 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-16 bg-slate-100 rounded-lg" />
        ))}
      </div>
      <div className="h-32 bg-slate-100 rounded-lg" />
      <div className="h-20 bg-slate-100 rounded-lg" />
      <div className="h-48 bg-slate-100 rounded-lg" />
    </div>
  );
}

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
    <div className="min-h-screen bg-white py-4 md:py-8">
      <div className="max-w-4xl mx-auto px-4 md:px-6">
        {/* Header - Mobile responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild className="h-10 w-10 p-0 md:w-auto md:p-2">
              <Link href="/theater-tech/surgical-cases" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden md:inline">Back</span>
              </Link>
            </Button>
            <div>
              <h1 className="text-lg md:text-xl font-semibold text-slate-900">Surgical Case Plan</h1>
              <p className="text-xs md:text-sm text-slate-500">Case ID: {caseId.slice(0, 8)}...</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Badge className={
              surgicalCase.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
              surgicalCase.status === 'PLANNING' ? 'bg-blue-100 text-blue-700' :
              'bg-slate-100 text-slate-700'
            }>
              {surgicalCase.status}
            </Badge>
            {isEditable && (
              <Button size="sm" asChild>
                <Link href={`/theater-tech/surgical-cases/${caseId}/edit`}>
                  <span className="hidden sm:inline">Continue Planning</span>
                  <span className="sm:hidden">Edit</span>
                  <ChevronRight className="h-4 w-4 ml-1 hidden sm:inline" />
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Patient Info - Mobile responsive grid */}
        <Card className="mb-4 md:mb-6 border-slate-200">
          <CardHeader className="pb-2 md:pb-3">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wide">Patient Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              <div>
                <p className="text-xs text-slate-400 mb-1">Name</p>
                <p className="font-medium text-slate-900 text-sm md:text-base">{surgicalCase.patient.first_name} {surgicalCase.patient.last_name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">File Number</p>
                <p className="font-medium text-slate-900 text-sm md:text-base">{surgicalCase.patient.file_number || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Date of Birth</p>
                <p className="font-medium text-slate-900 text-sm md:text-base">
                  {surgicalCase.patient.date_of_birth 
                    ? format(new Date(surgicalCase.patient.date_of_birth), 'MMM d, yyyy')
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Gender</p>
                <p className="font-medium text-slate-900 text-sm md:text-base">{surgicalCase.patient.gender || '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Procedure Details - Mobile responsive */}
        <Card className="mb-4 md:mb-6 border-slate-200">
          <CardHeader className="pb-2 md:pb-3">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wide">Procedure Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
              <div>
                <p className="text-xs text-slate-400 mb-1">Procedure Date</p>
                <p className="font-medium text-slate-900 text-sm md:text-base">
                  {surgicalCase.procedure_date 
                    ? format(new Date(surgicalCase.procedure_date), 'MMMM d, yyyy')
                    : 'Not scheduled'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Category</p>
                <p className="font-medium text-slate-900 text-sm md:text-base">{surgicalCase.procedure_category || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Case Type</p>
                <p className="font-medium text-slate-900 text-sm md:text-base">
                  {surgicalCase.primary_or_revision === 'PRIMARY' ? 'Primary' : 
                   surgicalCase.primary_or_revision === 'REVISION' ? 'Revision' : '—'}
                </p>
              </div>
            </div>

            {surgicalCase.case_procedures.length > 0 && (
              <div className="mb-4 md:mb-6">
                <p className="text-xs text-slate-400 mb-2">Procedures</p>
                <div className="flex flex-wrap gap-1.5 md:gap-2">
                  {surgicalCase.case_procedures.map(cp => (
                    <Badge key={cp.id} variant="outline" className="text-xs md:text-sm font-normal">
                      {cp.procedure.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs text-slate-400 mb-1">Diagnosis</p>
              <p className="text-slate-900 text-sm md:text-base">{surgicalCase.diagnosis || '—'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Surgical Team - Mobile responsive */}
        <Card className="mb-4 md:mb-6 border-slate-200">
          <CardHeader className="pb-2 md:pb-3">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wide">Surgical Team</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 md:gap-3">
              {selectedSurgeonNames.length > 0 ? (
                selectedSurgeonNames.map((name, i) => (
                  <div key={i} className="flex items-center gap-2 bg-slate-50 px-2 md:px-3 py-1.5 md:py-2 rounded-md">
                    <Stethoscope className="h-4 w-4 text-slate-500" />
                    <span className="font-medium text-slate-900 text-sm md:text-base">{name}</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-sm">No surgeons assigned</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Operative Details - Mobile responsive */}
        {(surgicalCase.anaesthesia_type || surgicalCase.skin_to_skin_minutes || surgicalCase.total_theatre_minutes || surgicalCase.admission_type) && (
          <Card className="mb-4 md:mb-6 border-slate-200">
            <CardHeader className="pb-2 md:pb-3">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wide">Operative Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {surgicalCase.anaesthesia_type && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Anaesthesia</p>
                    <p className="font-medium text-slate-900 text-sm md:text-base">
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
                    <p className="font-medium text-slate-900 text-sm md:text-base">{surgicalCase.skin_to_skin_minutes} min</p>
                  </div>
                )}
                {surgicalCase.total_theatre_minutes && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Total Theater Time</p>
                    <p className="font-medium text-slate-900 text-sm md:text-base">{surgicalCase.total_theatre_minutes} min</p>
                  </div>
                )}
                {surgicalCase.admission_type && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Admission</p>
                    <p className="font-medium text-slate-900 text-sm md:text-base">
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

        {/* Theater Items - Mobile responsive card view */}
        {surgicalCase.case_items.length > 0 && (
          <Card className="mb-4 md:mb-6 border-slate-200">
            <CardHeader className="pb-2 md:pb-3">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                Theater Items ({surgicalCase.case_items.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Mobile card view */}
              <div className="md:hidden space-y-2">
                {surgicalCase.case_items.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-900">{item.inventory_item.name}</span>
                    <span className="text-sm text-slate-600 font-medium">×{item.quantity}</span>
                  </div>
                ))}
              </div>
              {/* Desktop table view */}
              <table className="w-full hidden md:table">
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

        {/* Billing note — charges are managed in the edit form (Step 3) */}
        {isEditable && (
          <Card className="mb-4 md:mb-6 border-dashed border-slate-300 bg-slate-50">
            <CardContent className="py-5 text-center">
              <p className="text-sm font-medium text-slate-600 mb-1">Charge Sheet</p>
              <p className="text-xs text-slate-400 mb-3">
                Add services and inventory charges by continuing the case plan
              </p>
              <Button size="sm" asChild>
                <Link href={`/theater-tech/surgical-cases/${caseId}/edit`}>
                  Open Case Plan to Add Charges
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Metadata - Mobile responsive */}
        <div className="text-xs text-slate-400 border-t pt-3 md:pt-4 mt-4 md:mt-8">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
            <span>Created: {format(new Date(surgicalCase.created_at), 'MMM d, yyyy h:mm a')}</span>
            <span>Urgency: {surgicalCase.urgency}</span>
          </div>
        </div>
      </div>
    </div>
  );
}