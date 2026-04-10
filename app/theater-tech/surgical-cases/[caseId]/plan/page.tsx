/**
 * Theater Tech Surgical Case Plan Page
 * 
 * Route: /theater-tech/surgical-cases/[caseId]/plan
 * 
 * Shows read-only view for completed cases, edit form for draft/planning cases.
 */

import { getCurrentUser } from '@/lib/auth/server-auth';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Eye, Edit3, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SurgicalCasePlanForm } from '@/components/doctor/surgical-case-plan/SurgicalCasePlanForm';
import { format } from 'date-fns';

interface PageProps {
  params: Promise<{ caseId: string }>;
}

export default async function TheaterTechPlanPage({ params }: PageProps) {
  const { caseId } = await params;
  const user = await getCurrentUser();
  
  if (!user || (user.role !== 'THEATER_TECHNICIAN' && user.role !== 'ADMIN')) {
    redirect('/login');
  }

  // Fetch the case with full details for read-only view
  const surgicalCase = await db.surgicalCase.findUnique({
    where: { id: caseId },
    include: {
      patient: true,
      primary_surgeon: { select: { name: true } },
      case_items: { include: { inventory_item: true } },
      case_plan: true,
    }
  });

  if (!surgicalCase) {
    redirect('/theater-tech/consultations');
  }

  const statusToCheck = surgicalCase.status;

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
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
                Surgical Plan
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
        </div>
        
        {(statusToCheck === 'COMPLETED' || statusToCheck === 'CANCELLED' || statusToCheck === 'IN_THEATER' || statusToCheck === 'RECOVERY') ? (
          /* Read-only view for completed cases */
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Case Details (Read-only)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase">Procedure</p>
                  <p className="font-medium">
                    {surgicalCase.procedure_name || surgicalCase.case_plan?.procedure_plan || 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Procedure Date</p>
                  <p className="font-medium">
                    {surgicalCase.procedure_date 
                      ? format(new Date(surgicalCase.procedure_date), 'MMM d, yyyy')
                      : 'Not scheduled'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Surgeon</p>
                  <p className="font-medium">{surgicalCase.primary_surgeon.name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Diagnosis</p>
                  <p className="font-medium">{surgicalCase.diagnosis || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Urgency</p>
                  <p className="font-medium">{surgicalCase.urgency || 'ELECTIVE'}</p>
                </div>
              </div>
              
              {surgicalCase.case_items.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 uppercase mb-2">Theater Items ({surgicalCase.case_items.length})</p>
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
        ) : (
          /* Edit form for draft/planning cases */
          <SurgicalCasePlanForm 
            caseId={caseId} 
            initialData={{ surgeonId: surgicalCase.primary_surgeon_id }}
          />
        )}
      </div>
    </div>
  );
}