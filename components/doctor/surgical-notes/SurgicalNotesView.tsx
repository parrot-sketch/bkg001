import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText, Printer, Edit, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useMemo } from 'react';

interface SurgicalNotesData {
  pre_op_notes?: string | null;
  procedure_plan?: string | null;
  surgeon_narrative?: string | null;
  equipment_notes?: string | null;
  special_instructions?: string | null;
  risk_factors?: string | null;
  post_op_instructions?: string | null;
  planned_anesthesia?: string | null;
}

interface Props {
  caseId: string;
  data: SurgicalNotesData;
  onEdit: () => void;
  onContinue?: () => void;
}

export function SurgicalNotesView({ caseId, data, onEdit, onContinue }: Props) {
  // Consolidate logic for consistent view even if not yet saved in new format
  const documentContent = useMemo(() => {
    if (data.surgeon_narrative && data.surgeon_narrative.trim().length > 0) {
      return data.surgeon_narrative;
    }

    const sections = [
      { label: 'Procedure Plan', value: data.procedure_plan },
      { label: 'Pre-Operative Notes', value: data.pre_op_notes },
      { label: 'Anesthesia', value: data.planned_anesthesia },
      { label: 'Risk Factors', value: data.risk_factors },
      { label: 'Equipment', value: data.equipment_notes },
      { label: 'Special Instructions', value: data.special_instructions },
      { label: 'Post-Operative Instructions', value: data.post_op_instructions },
    ];

    const html = sections
      .filter(s => s.value && s.value.replace(/<[^>]+>/g, '').trim().length > 0)
      .map(s => `<h2 style="font-size: 1.1rem; font-weight: bold; margin-bottom: 0.5rem; color: #475569; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.25rem;">${s.label}</h2>${s.value}`)
      .join('<br/><br/>');

    return html;
  }, [data]);

  const isEmpty = !documentContent || documentContent.trim().length === 0;

  return (
    <Card className="shadow-sm border-slate-200 w-full animate-in fade-in duration-300 mb-8 bg-white overflow-hidden">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 px-4 md:px-6 gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base md:text-lg text-slate-800">
             <FileText className="h-4 w-4 md:h-5 md:w-5 text-slate-500" />
             Surgical Note
          </CardTitle>
          <CardDescription className="text-xs md:text-sm mt-0.5">
            Clinical narrative document
          </CardDescription>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
           <Button 
             variant="outline"
             size="sm"
             className="h-8 px-3 text-xs md:text-sm md:h-9 bg-white"
             asChild
           >
             <Link href={`/doctor/surgical-cases/${caseId}/notes/print`} target="_blank">
               <Printer className="h-3.5 w-3.5 mr-1.5" />
               Print
             </Link>
           </Button>
           <Button 
             size="sm"
             onClick={onEdit} 
             className="bg-slate-900 text-white shadow-none h-8 px-3 text-xs md:text-sm md:h-9 font-bold"
           >
             <Edit className="h-3.5 w-3.5 mr-1.5" />
             {isEmpty ? 'Create Note' : 'Edit Note'}
           </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 md:p-10 bg-white">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-10 w-10 text-slate-200 mb-3" />
            <h3 className="text-base font-semibold text-slate-700">No narrative recorded yet</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              Click create to document the surgical narrative, operative findings, and post-operative plan.
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            <div 
              className="prose prose-sm md:prose-base max-w-none prose-slate"
              dangerouslySetInnerHTML={{ __html: documentContent }}
            />
            
            {/* Signature Block (Visual only for PDF/Print readiness) */}
            <div className="mt-16 pt-8 border-t border-slate-200 flex justify-end">
               <div className="text-center">
                  <div className="w-48 h-px bg-slate-400 mb-2"></div>
                  <p className="text-xs text-slate-500 font-medium">Surgeon's Signature</p>
               </div>
            </div>

            {onContinue && (
                <div className="flex justify-end mt-12 pt-8 border-t border-slate-100">
                    <Button 
                        onClick={onContinue}
                        className="bg-slate-900 text-white gap-2 px-8 h-12 rounded-full shadow-lg shadow-slate-200/50 transition-all hover:scale-[1.02] active:scale-[0.98] font-bold"
                    >
                        Proceed to Charge Sheet
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
