import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Save, FileText, CheckCircle2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/consultation/RichTextEditor';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { SurgicalNotesView } from './SurgicalNotesView';

const surgicalNotesSchema = z.object({
  pre_op_notes: z.string().optional().nullable(),
  procedure_plan: z.string().optional().nullable(),
  surgeon_narrative: z.string().optional().nullable(),
  equipment_notes: z.string().optional().nullable(),
  special_instructions: z.string().optional().nullable(),
  risk_factors: z.string().optional().nullable(),
  post_op_instructions: z.string().optional().nullable(),
  planned_anesthesia: z.string().optional().nullable(),
});

type SurgicalNotesValues = z.infer<typeof surgicalNotesSchema>;

interface Props {
  caseId: string;
  onContinue?: () => void;
}

export function SurgicalNotesEditor({ caseId, onContinue }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Start in view mode by default, unless there's absolutely no data (we'll determine that after fetching)
  const [isEditing, setIsEditing] = useState(false);
  const [notesData, setNotesData] = useState<SurgicalNotesValues | null>(null);

  const form = useForm<SurgicalNotesValues>({
    resolver: zodResolver(surgicalNotesSchema),
    defaultValues: {
      pre_op_notes: '',
      procedure_plan: '',
      surgeon_narrative: '',
      equipment_notes: '',
      special_instructions: '',
      risk_factors: '',
      post_op_instructions: '',
      planned_anesthesia: '',
    },
  });

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/doctor/surgical-cases/${caseId}/notes`);
      const json = await res.json();
      
      if (json.success && json.data) {
        setNotesData(json.data);
        form.reset({
          pre_op_notes: json.data.pre_op_notes || '',
          procedure_plan: json.data.procedure_plan || '',
          surgeon_narrative: json.data.surgeon_narrative || '',
          equipment_notes: json.data.equipment_notes || '',
          special_instructions: json.data.special_instructions || '',
          risk_factors: json.data.risk_factors || '',
          post_op_instructions: json.data.post_op_instructions || '',
          planned_anesthesia: json.data.planned_anesthesia || '',
        });
        
        // If everything is basically empty, automatically switch to edit mode
        const hasContent = Object.values(json.data).some(val => typeof val === 'string' && val.length > 0);
        if (!hasContent) {
            setIsEditing(true);
        }
      } else {
        // No data means brand new
        setIsEditing(true);
      }
    } catch (err) {
      console.error('Failed to load surgical notes', err);
      setError('Failed to load existing notes.');
    } finally {
      setIsLoading(false);
    }
  }, [caseId, form]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const onSubmit = async (values: SurgicalNotesValues) => {
    setIsSaving(true);
    setSaveSuccess(false);
    setError(null);
    
    try {
      const res = await fetch(`/api/doctor/surgical-cases/${caseId}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to save notes');
      
      setSaveSuccess(true);
      setNotesData(values); // Optimistic update
      
      setTimeout(() => {
          setSaveSuccess(false);
          setIsEditing(false); // Switch back to view mode after saving
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-16 flex flex-col items-center justify-center">
           <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
           <p className="mt-4 text-sm text-slate-500 font-medium">Loading surgical records...</p>
        </CardContent>
      </Card>
    );
  }

  // If not editing, show the View component
  if (!isEditing && notesData) {
      return (
          <SurgicalNotesView 
              caseId={caseId} 
              data={notesData} 
              onEdit={() => setIsEditing(true)} 
              onContinue={onContinue}
          />
      );
  }

  const sections = [
    { name: 'procedure_plan', label: 'Procedure Plan', placeholder: 'Plan...' },
    { name: 'pre_op_notes', label: 'Pre-Op Notes', placeholder: 'Pre-op observations...' },
    { name: 'surgeon_narrative', label: 'Surgeon Narrative', placeholder: 'Operative narrative...' },
    { name: 'risk_factors', label: 'Risk Factors', placeholder: 'Risks...' },
    { name: 'planned_anesthesia', label: 'Anesthesia', placeholder: 'General / Local' },
    { name: 'equipment_notes', label: 'Equipment', placeholder: 'Instruments needed...' },
    { name: 'special_instructions', label: 'Instructions', placeholder: 'Unique requirements...' },
    { name: 'post_op_instructions', label: 'Post-Op', placeholder: 'Recovery instructions...' },
  ] as const;

  return (
    <Card className="shadow-sm border-slate-200 w-full animate-in fade-in duration-300 mb-8 overflow-hidden bg-white">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 px-4 md:px-6 gap-3">
        <CardTitle className="flex items-center gap-2 text-base md:text-lg text-slate-800">
           <FileText className="h-4 w-4 md:h-5 md:w-5 text-slate-500" />
           Surgical Notes
        </CardTitle>
        
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
           {error && <span className="text-xs font-medium text-destructive truncate">{error}</span>}
           {saveSuccess && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                <CheckCircle2 className="h-3 w-3" />
                Saved
              </span>
           )}
           {notesData && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
                className="h-8 px-3 text-xs md:text-sm md:h-9"
              >
                Cancel
              </Button>
           )}
           <Button 
             size="sm"
             onClick={form.handleSubmit(onSubmit)} 
             disabled={isSaving}
             className="bg-slate-900 text-white shadow-none h-8 px-3 text-xs md:text-sm md:h-9"
           >
             {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
             Save
           </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <Form {...form}>
          <form className="pb-4">
            <Accordion type="multiple" defaultValue={['pre-op', 'operative', 'post-op']} className="w-full">
              
              {/* Pre-Operative Group */}
              <AccordionItem value="pre-op" className="border-b-0 px-4 md:px-6 py-1">
                <AccordionTrigger className="text-sm md:text-base font-semibold text-slate-800 hover:no-underline py-3">
                  Pre-Operative Planning
                </AccordionTrigger>
                <AccordionContent className="space-y-6 pb-4">
                  {sections.filter(s => ['procedure_plan', 'pre_op_notes', 'planned_anesthesia'].includes(s.name)).map(section => (
                    <FormField key={section.name} control={form.control} name={section.name} render={({ field }) => (
                      <FormItem>
                        <Label className="text-sm font-semibold text-slate-700 mb-1.5 block">{section.label}</Label>
                        <FormControl>
                          <RichTextEditor placeholder={section.placeholder} content={field.value || ''} onChange={field.onChange} minHeight="80px" className="bg-white" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  ))}
                </AccordionContent>
              </AccordionItem>
              
              <div className="h-px bg-slate-100 mx-4 md:mx-6" />

              {/* Operative Group */}
              <AccordionItem value="operative" className="border-b-0 px-4 md:px-6 py-1">
                <AccordionTrigger className="text-sm md:text-base font-semibold text-slate-800 hover:no-underline py-3">
                  Operative Narrative
                </AccordionTrigger>
                <AccordionContent className="space-y-6 pb-4">
                  {sections.filter(s => ['surgeon_narrative', 'equipment_notes'].includes(s.name)).map(section => (
                    <FormField key={section.name} control={form.control} name={section.name} render={({ field }) => (
                      <FormItem>
                        <Label className="text-sm font-semibold text-slate-700 mb-1.5 block">{section.label}</Label>
                        <FormControl>
                          <RichTextEditor placeholder={section.placeholder} content={field.value || ''} onChange={field.onChange} minHeight="100px" className="bg-white" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  ))}
                </AccordionContent>
              </AccordionItem>

              <div className="h-px bg-slate-100 mx-4 md:mx-6" />

              {/* Post-Operative Group */}
              <AccordionItem value="post-op" className="border-b-0 px-4 md:px-6 py-1">
                <AccordionTrigger className="text-sm md:text-base font-semibold text-slate-800 hover:no-underline py-3">
                  Post-Operative & Safety
                </AccordionTrigger>
                <AccordionContent className="space-y-6 pb-2">
                  {sections.filter(s => ['risk_factors', 'special_instructions', 'post_op_instructions'].includes(s.name)).map(section => (
                    <FormField key={section.name} control={form.control} name={section.name} render={({ field }) => (
                      <FormItem>
                        <Label className="text-sm font-semibold text-slate-700 mb-1.5 block">{section.label}</Label>
                        <FormControl>
                          <RichTextEditor placeholder={section.placeholder} content={field.value || ''} onChange={field.onChange} minHeight="80px" className="bg-white" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  ))}
                </AccordionContent>
              </AccordionItem>

            </Accordion>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
