import db from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Users, Package, CheckCircle, Save } from 'lucide-react';
import Link from 'next/link';
import { CaseItemsSelector } from './CaseItemsSelector';

export default async function TheaterPrepPage({ params }: { params: Promise<{ caseId: string }> }) {
    const { caseId } = await params;
    
    // Auth
    const user = await getCurrentUser();
    if (!user || (user.role !== 'THEATER_TECHNICIAN' && user.role !== 'ADMIN')) {
        redirect('/login');
    }

    // Fetch case and relations
    const caseData = await db.surgicalCase.findUnique({
        where: { id: caseId },
        include: {
            patient: { select: { first_name: true, last_name: true, file_number: true } },
            primary_surgeon: { select: { name: true } },
            team_members: true,
            case_items: {
                include: { inventory_item: { select: { name: true, category: true } } },
                orderBy: { created_at: 'asc' }
            },
            case_plan: {
                include: {
                    planned_items: {
                        include: {
                            inventory_item: { select: { name: true, category: true } },
                            service: { select: { service_name: true } }
                        }
                    }
                }
            }
        }
    });

    if (!caseData) notFound();

    // Fetch catalog
    const catalog = await db.inventoryItem.findMany({
        where: { is_active: true },
        select: { id: true, name: true, sku: true, category: true },
        orderBy: { name: 'asc' }
    });

    const isEditable = caseData.status === 'READY_FOR_THEATER_BOOKING' || caseData.status === 'READY_FOR_THEATER_PREP' || caseData.status === 'IN_WARD_PREP' || caseData.status === 'READY_FOR_WARD_PREP';
    
    // Convert Dates to string for Client Component bridging
    const parsedSelectedItems = caseData.case_items.map(i => ({
        id: i.id,
        inventory_item_id: i.inventory_item_id,
        quantity: i.quantity,
        notes: i.notes,
        inventory_item: i.inventory_item
    }));

    return (
        <div className="p-6 space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/theater-tech/dashboard">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Theater Preparation</h1>
                        <p className="text-sm text-slate-500">Pick required items and review team assignments</p>
                    </div>
                </div>
                
                {caseData.status === 'READY_FOR_THEATER_PREP' && (
                    <Badge variant="secondary" className="px-3 py-1 text-sm bg-blue-100 text-blue-800 hover:bg-blue-100">
                        In Preparation
                    </Badge>
                )}
            </div>

            {/* Patient Info */}
            <Card className="shadow-sm">
                <CardHeader className="pb-3 border-b bg-slate-50/50">
                    <CardTitle className="text-base">Case Information</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="space-y-1">
                            <Label className="text-xs text-slate-500 uppercase tracking-wider">Patient</Label>
                            <p className="font-medium text-sm">{caseData.patient?.first_name} {caseData.patient?.last_name}</p>
                            {caseData.patient?.file_number && (
                                <p className="text-xs text-slate-400">File: {caseData.patient.file_number}</p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-slate-500 uppercase tracking-wider">Procedure</Label>
                            <p className="font-medium text-sm">{caseData.procedure_name || 'Not specified'}</p>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-slate-500 uppercase tracking-wider">Primary Surgeon</Label>
                            <p className="font-medium text-sm">{caseData.primary_surgeon?.name || 'Not assigned'}</p>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-slate-500 uppercase tracking-wider">Status</Label>
                            <div><Badge variant="outline">{caseData.status}</Badge></div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                    {/* Team Members (READ ONLY) */}
                    <Card className="shadow-sm">
                        <CardHeader className="pb-3 border-b bg-slate-50/50">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Assigned Surgical Team
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 px-0">
                            {caseData.team_members.length === 0 ? (
                                <div className="text-center py-4 text-sm text-slate-500">
                                    No team members assigned by the surgeon yet.
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {caseData.team_members.map(member => (
                                        <div key={member.id} className="px-6 py-3 flex justify-between items-center group hover:bg-slate-50">
                                            <div>
                                                <p className="font-medium text-sm">{member.name}</p>
                                                {member.is_external && member.external_credentials && (
                                                    <p className="text-xs text-slate-500">{member.external_credentials}</p>
                                                )}
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <Badge variant="secondary" className="text-[10px] uppercase">
                                                    {member.role.replace(/_/g, ' ')}
                                                </Badge>
                                                {member.is_external && <Badge variant="outline" className="text-[9px]">EXTERNAL</Badge>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Pre-planned Items */}
                    <Card className="shadow-sm">
                        <CardHeader className="pb-3 border-b bg-slate-50/50">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                Doctor's Planned Items
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            {!caseData.case_plan?.planned_items || caseData.case_plan.planned_items.length === 0 ? (
                                <p className="text-sm text-slate-500 italic text-center py-2">No advance items planned by surgeon.</p>
                            ) : (
                                <div className="space-y-2">
                                    {caseData.case_plan.planned_items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-2 rounded-md bg-slate-50 border border-slate-100">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">
                                                    {item.inventory_item?.name || item.service?.service_name || 'Unknown Item'}
                                                </span>
                                                {item.inventory_item?.category && (
                                                    <span className="text-[10px] text-slate-500 uppercase">{item.inventory_item.category}</span>
                                                )}
                                            </div>
                                            <span className="text-sm font-semibold bg-white px-2 py-0.5 border rounded-sm">
                                                Qty: {item.planned_quantity || 1}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    {/* Tech selected items */}
                    <CaseItemsSelector 
                        caseId={caseId} 
                        catalog={catalog} 
                        selectedItems={parsedSelectedItems} 
                        isEditable={isEditable}
                    />

                    {/* Temporary submission block until Full Theater process is built */}
                    {isEditable && (
                        <Card className="border-primary/20 bg-primary/5">
                            <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                                <p className="text-sm text-slate-700">Finished selecting items for theater prep?</p>
                                <form action={async () => {
                                    'use server';
                                    await db.surgicalCase.update({
                                        where: { id: caseId },
                                        data: { status: 'READY_FOR_THEATER_BOOKING' }
                                    });
                                    redirect('/theater-tech/dashboard');
                                }}>
                                    <Button type="submit" className="w-full sm:w-auto">
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Complete Prep
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
