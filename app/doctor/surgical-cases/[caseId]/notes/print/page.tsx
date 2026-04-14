import db from '@/lib/db';
import { notFound } from 'next/navigation';
import { FileText, Printer, Calendar, Clock, User, Phone, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

interface Props {
  params: Promise<{ caseId: string }>;
}

export default async function SurgicalNotesPrintPage({ params }: Props) {
  const { caseId } = await params;

  const surgicalCase = await db.surgicalCase.findUnique({
    where: { id: caseId },
    include: {
      patient: true,
      case_plan: true,
    },
  });

  if (!surgicalCase || !surgicalCase.case_plan) {
    return (
      <div className="flex h-screen w-full items-center justify-center p-8 text-center text-slate-500">
        <div>
          <FileText className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <h2 className="text-xl font-bold text-slate-700">No Surgical Notes Found</h2>
          <p className="mt-2">Surgical notes for this case have not been recorded yet.</p>
        </div>
      </div>
    );
  }

  // Fallback to fetch doctor manually if relation isn't directly on case_plan or surgicalCase in Prisma model safely
  let surgeonName = 'Assigned Surgeon';
  if (surgicalCase.primary_surgeon_id) {
    const doctor = await db.doctor.findUnique({ where: { id: surgicalCase.primary_surgeon_id } });
    if (doctor) {
      surgeonName = doctor.name;
    }
  }

  const { patient, case_plan: notes } = surgicalCase;

  // Formatting helpers
  const today = format(new Date(), 'dd MMM yyyy, HH:mm');
  const patientAge = new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear();

  // Re-use logic from SurgicalNotesView
  const SECTIONS = [
    { key: 'procedure_plan', label: 'Procedure Plan' },
    { key: 'pre_op_notes', label: 'Pre-Operative Notes' },
    { key: 'planned_anesthesia', label: 'Planned Anesthesia' },
    { key: 'surgeon_narrative', label: 'Operative Narrative' },
    { key: 'equipment_notes', label: 'Equipment & Instruments' },
    { key: 'risk_factors', label: 'Identified Risk Factors' },
    { key: 'special_instructions', label: 'Special Instructions' },
    { key: 'post_op_instructions', label: 'Post-Operative Instructions' },
  ] as const;

  const activeSections = SECTIONS.filter((s) => {
    const html = notes[s.key as keyof typeof notes];
    if (typeof html !== 'string' || !html) return false;
    const stripped = html.replace(/<[^>]+>/g, '').trim();
    return stripped.length > 0;
  });

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8 print:p-0 print:bg-white font-sans">
      <div className="max-w-4xl mx-auto bg-white shadow-lg print:shadow-none p-10 md:p-14 print:p-8 text-slate-800">
        
        {/* Action Bar (Hidden when printing) */}
        <div className="flex items-center justify-between mb-8 print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <FileText className="h-6 w-6 text-slate-500" />
              Surgical Notes PDF Export
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Generated on {today}
            </p>
          </div>
          <Button 
            onClick={() => {
                if (typeof window !== 'undefined') window.print();
            }} 
            className="hidden sm:flex bg-slate-900 text-white"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print Document
          </Button>
        </div>

        {/* --- PRINTABLE DOCUMENT SECTION --- */}
        <div className="print-area">
          {/* Clinic Header */}
          <header className="border-b-2 border-slate-900 pb-6 mb-8 flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
                Nairobi Sculpt
              </h2>
              <p className="text-sm text-slate-500 font-medium tracking-wide">
                SURGICAL AESTHETIC CENTER
              </p>
            </div>
            <div className="text-right text-xs text-slate-500 space-y-1">
              <p>Generals Towers, 4th Floor</p>
              <p>Nairobi, Kenya</p>
              <p>+254 700 000 000</p>
              <p>care@nairobisculpt.com</p>
            </div>
          </header>

          {/* Document Title */}
          <div className="text-center mb-8">
            <h3 className="text-xl font-bold text-slate-800 uppercase tracking-widest bg-slate-100 print:bg-slate-100 py-2">
              Clinical Surgical Notes
            </h3>
          </div>

          {/* Patient Demographics */}
          <div className="grid grid-cols-2 gap-6 mb-10 text-sm border-b border-slate-200 pb-10">
            <div className="space-y-4">
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase">Patient Name</span>
                <span className="font-semibold text-slate-800 text-base">
                  {patient.first_name} {patient.last_name}
                </span>
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase">File Number / Sex / Age</span>
                <span className="text-slate-800">
                  {patient.file_number} &nbsp;|&nbsp; {patient.gender} &nbsp;|&nbsp; {patientAge} yrs
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
               <div>
                 <span className="block text-xs font-bold text-slate-400 uppercase">Primary Surgeon</span>
                 <span className="font-semibold text-slate-800 text-base">{surgeonName}</span>
               </div>
               <div>
                 <span className="block text-xs font-bold text-slate-400 uppercase">Procedure</span>
                 <span className="text-slate-800">{surgicalCase.procedure_name || 'Not specified'}</span>
               </div>
            </div>
          </div>

          {/* Notes Content */}
          <div className="space-y-8">
            {activeSections.length === 0 ? (
              <p className="text-slate-500 italic">No notes recorded for this case.</p>
            ) : (
                activeSections.map((section) => {
                    const htmlContent = notes[section.key as keyof typeof notes] as string || '';
                    return (
                        <section key={section.key} className="break-inside-avoid border border-slate-100 rounded-md p-5 print:border-none print:p-0">
                            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 pb-2 border-b border-slate-200">
                                {section.label}
                            </h4>
                            <div 
                                className="prose prose-sm max-w-none prose-slate"
                                dangerouslySetInnerHTML={{ __html: htmlContent }}
                            />
                        </section>
                    );
                })
            )}
          </div>

          {/* Signatures */}
          <div className="mt-16 pt-8 break-inside-avoid">
             <div className="grid grid-cols-2 gap-20">
                <div className="text-center">
                    <div className="h-20 border-b border-slate-400 mb-2 flex items-end justify-center">
                        {/* Interactive Signature Area Could Go Here later */}
                    </div>
                    <p className="text-sm text-slate-800 font-bold">{surgeonName}</p>
                    <p className="text-xs text-slate-500">Operating Surgeon</p>
                    <p className="text-xs text-slate-500 mt-1">Date: _________________</p>
                </div>
                <div className="text-center">
                    <div className="h-20 border-b border-slate-400 mb-2"></div>
                    <p className="text-sm text-slate-800 font-bold">Assisting Staff</p>
                    <p className="text-xs text-slate-500">Name & Signature</p>
                    <p className="text-xs text-slate-500 mt-1">Date: _________________</p>
                </div>
             </div>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-slate-200 text-center print:fixed print:bottom-0 print:left-0 print:right-0 print:border-none print:pt-0">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                  DOCUMENT GENERATED AUTOMATICALLY BY NAIROBI SCULPT CORE — {today}
              </p>
          </div>

        </div>
      </div>
      
      <script dangerouslySetInnerHTML={{ __html: `
        // Auto-print prompt on load if desired, standard practice for /print pages
        // window.onload = function() { window.print(); }
      `}} />
    </div>
  );
}
