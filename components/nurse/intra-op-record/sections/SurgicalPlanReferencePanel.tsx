'use client';

import { Card, CardContent } from '@/components/ui/card';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { ClipboardCheck } from 'lucide-react';

interface SurgicalPlanReferencePanelProps {
    casePlan: any;
}

export function SurgicalPlanReferencePanel({ casePlan }: SurgicalPlanReferencePanelProps) {
    if (!casePlan) return null;

    return (
        <Card className="border-indigo-200 bg-indigo-50/20">
            <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-indigo-600" />
                    <span className="text-sm font-semibold text-slate-800">Surgical Plan Reference</span>
                </div>

                <Accordion type="single" collapsible className="w-full">
                    {casePlan.procedure_plan && (
                        <AccordionItem value="plan" className="border-b-0">
                            <AccordionTrigger className="py-2 text-xs font-medium hover:no-underline">Procedure Plan</AccordionTrigger>
                            <AccordionContent>
                                <div
                                    className="text-sm prose prose-sm max-w-none text-slate-600 bg-white/50 p-3 rounded border border-indigo-100"
                                    dangerouslySetInnerHTML={{ __html: casePlan.procedure_plan }}
                                />
                            </AccordionContent>
                        </AccordionItem>
                    )}
                    {casePlan.special_instructions && (
                        <AccordionItem value="instructions" className="border-b-0">
                            <AccordionTrigger className="py-2 text-xs font-medium hover:no-underline">Special Instructions</AccordionTrigger>
                            <AccordionContent>
                                <div
                                    className="text-sm prose prose-sm max-w-none text-slate-600 bg-white/50 p-3 rounded border border-indigo-100"
                                    dangerouslySetInnerHTML={{ __html: casePlan.special_instructions }}
                                />
                            </AccordionContent>
                        </AccordionItem>
                    )}
                    {casePlan.pre_op_notes && (
                        <AccordionItem value="notes" className="border-b-0">
                            <AccordionTrigger className="py-2 text-xs font-medium hover:no-underline">Pre-op Notes</AccordionTrigger>
                            <AccordionContent>
                                <div
                                    className="text-sm prose prose-sm max-w-none text-slate-600 bg-white/50 p-3 rounded border border-indigo-100"
                                    dangerouslySetInnerHTML={{ __html: casePlan.pre_op_notes }}
                                />
                            </AccordionContent>
                        </AccordionItem>
                    )}
                </Accordion>

                {casePlan.planned_anesthesia && (
                    <div className="pt-2 border-t border-indigo-100">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase">Planned Anesthesia</p>
                        <p className="text-xs font-semibold text-slate-700">{casePlan.planned_anesthesia}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
