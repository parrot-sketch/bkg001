/**
 * Theater Tech Surgical Case Plan Page
 * 
 * Route: /theater-tech/surgical-cases/[caseId]/plan
 * 
 * Complete surgical case planning including:
 * - Patient/procedure details  
 * - Inventory items
 * - Charge sheet
 */

import { getCurrentUser } from '@/lib/auth/server-auth';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Package, FileText, Calendar, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
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

  const surgicalCase = await db.surgicalCase.findUnique({
    where: { id: caseId },
    include: {
      patient: true,
      primary_surgeon: { select: { name: true, title: true } },
      case_items: {
        include: { inventory_item: true },
      },
      case_plan: true,
      }
  });

  if (!surgicalCase) {
    redirect('/theater-tech/surgical-cases');
  }

  const isEditable = surgicalCase.status === 'DRAFT' || surgicalCase.status === 'PLANNING';

  // Calculate totals from items
  const itemsTotal = surgicalCase.case_items.reduce((sum, item) => {
    return sum + (item.quantity * Number(item.inventory_item.unit_cost || 0));
  }, 0);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/theater-tech/surgical-cases">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Surgical Case Plan
            </h1>
            <p className="text-sm text-slate-500">
              Complete planning for {surgicalCase.patient.first_name} {surgicalCase.patient.last_name}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          {surgicalCase.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Planning Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Info */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-slate-500">Patient Name</Label>
                <p className="font-medium">{surgicalCase.patient.first_name} {surgicalCase.patient.last_name}</p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">File Number</Label>
                <p className="font-medium">{surgicalCase.patient.file_number || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Date of Birth</Label>
                <p className="font-medium">
                  {surgicalCase.patient.date_of_birth 
                    ? format(new Date(surgicalCase.patient.date_of_birth), 'MMM d, yyyy') 
                    : 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Gender</Label>
                <p className="font-medium capitalize">{surgicalCase.patient.gender || 'N/A'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Procedure */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Procedure Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-slate-500">Procedure</Label>
                <p className="font-medium">{surgicalCase.procedure_name || 'Not specified'}</p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Procedure Date</Label>
                <p className="font-medium">
                  {surgicalCase.procedure_date 
                    ? format(new Date(surgicalCase.procedure_date), 'MMM d, yyyy') 
                    : 'Not scheduled'}
                </p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Surgeon</Label>
                <p className="font-medium">{surgicalCase.primary_surgeon.name}</p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Side</Label>
                <p className="font-medium capitalize">{surgicalCase.side || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-slate-500">Diagnosis</Label>
                <p className="font-medium">{surgicalCase.diagnosis || 'Not specified'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Items */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Theater Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {surgicalCase.case_items.length === 0 ? (
                  <p className="text-sm text-slate-500">No items selected</p>
                ) : (
                  surgicalCase.case_items.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.inventory_item.name}</span>
                      <span className="text-slate-500">x{item.quantity}</span>
                    </div>
                  ))
                )}
              </div>
              {isEditable && (
                <Button variant="outline" className="w-full mt-4" asChild>
                  <Link href={`/theater-tech/dashboard/${caseId}`}>
                    <Package className="h-4 w-4 mr-2" />
                    Manage Theater Items
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Charge Sheet */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Charge Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Theater Items</span>
                <span className="font-medium">KSh {itemsTotal.toLocaleString()}</span>
              </div>
              <div className="border-t pt-4 flex justify-between">
                <span className="font-medium">Total</span>
                <span className="font-semibold text-lg">KSh {itemsTotal.toLocaleString()}</span>
              </div>
              <Button className="w-full" disabled={!isEditable}>
                <Save className="h-4 w-4 mr-2" />
                Save Plan
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}