import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Save, FileText, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/consultation/RichTextEditor';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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
}

export function SurgicalNotesEditor({ caseId }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    async function fetchNotes() {
      try {
        const res = await fetch(`/api/doctor/surgical-cases/${caseId}/notes`);
        const json = await res.json();
        
        if (json.success && json.data) {
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
        }
      } catch (err) {
        console.error('Failed to load surgical notes', err);
        setError('Failed to load existing notes.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchNotes();
  }, [caseId, form]);

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
      setTimeout(() => setSaveSuccess(false), 3000);
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

  const sections = [
    { name: 'procedure_plan', label: 'Procedure Plan', placeholder: 'Outline your intended surgical steps...' },
    { name: 'pre_op_notes', label: 'Pre-Op Notes', placeholder: 'Relevant pre-operative observations...' },
    { name: 'surgeon_narrative', label: 'Surgeon Narrative', placeholder: 'Detailed operative narrative and findings...' },
    { name: 'risk_factors', label: 'Risk Factors', placeholder: 'Identified clinical risks...' },
    { name: 'planned_anesthesia', label: 'Planned Anesthesia', placeholder: 'e.g., General / Local / Regional' },
    { name: 'equipment_notes', label: 'Equipment Notes', placeholder: 'Specific instruments or setup required...' },
    { name: 'special_instructions', label: 'Special Instructions', placeholder: 'Unique requirements or warnings...' },
    { name: 'post_op_instructions', label: 'Post-Op Instructions', placeholder: 'Instructions for recovery and ward staff...' },
  ] as const;

  return (
    <Card className="shadow-sm border-slate-200 w-full animate-in fade-in duration-300 mb-8">
      <CardHeader className="bg-white border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between py-5 px-6 gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
             <FileText className="h-5 w-5 text-slate-500" />
             Surgical Notes
          </CardTitle>
          <CardDescription className="mt-1">
             Comprehensive narrative and clinical planning
          </CardDescription>
        </div>
        
        <div className="flex items-center gap-3">
           {error && <span className="text-sm font-medium text-destructive">{error}</span>}
           {saveSuccess && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-md">
                <CheckCircle2 className="h-4 w-4" />
                Saved
              </span>
           )}
           <Button 
             onClick={form.handleSubmit(onSubmit)} 
             disabled={isSaving}
             className="bg-slate-900 text-white"
           >
             {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
             Save Notes
           </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 bg-slate-50/30">
        <Form {...form}>
          <form className="pb-6">
            <Accordion type="multiple" defaultValue={['pre-op', 'operative', 'post-op']} className="w-full">
              
              {/* Pre-Operative Group */}
              <AccordionItem value="pre-op" className="border-b-0 px-6 md:px-8 py-2">
                <AccordionTrigger className="text-lg font-semibold text-slate-800 hover:no-underline py-4">
                  Pre-Operative Planning
                </AccordionTrigger>
                <AccordionContent className="space-y-8 pb-6">
                  {sections.filter(s => ['procedure_plan', 'pre_op_notes', 'planned_anesthesia'].includes(s.name)).map(section => (
                    <FormField key={section.name} control={form.control} name={section.name} render={({ field }) => (
                      <FormItem>
                        <Label className="text-base font-semibold text-slate-800 mb-2 block">{section.label}</Label>
                        <FormControl>
                          <RichTextEditor placeholder={section.placeholder} content={field.value || ''} onChange={field.onChange} minHeight="120px" className="bg-white" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  ))}
                </AccordionContent>
              </AccordionItem>
              
              <div className="h-px bg-slate-200 mx-6 md:mx-8" />

              {/* Operative Group */}
              <AccordionItem value="operative" className="border-b-0 px-6 md:px-8 py-2">
                <AccordionTrigger className="text-lg font-semibold text-slate-800 hover:no-underline py-4">
                  Operative Narrative
                </AccordionTrigger>
                <AccordionContent className="space-y-8 pb-6">
                  {sections.filter(s => ['surgeon_narrative', 'equipment_notes'].includes(s.name)).map(section => (
                    <FormField key={section.name} control={form.control} name={section.name} render={({ field }) => (
                      <FormItem>
                        <Label className="text-base font-semibold text-slate-800 mb-2 block">{section.label}</Label>
                        <FormControl>
                          <RichTextEditor placeholder={section.placeholder} content={field.value || ''} onChange={field.onChange} minHeight="120px" className="bg-white" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  ))}
                </AccordionContent>
              </AccordionItem>

              <div className="h-px bg-slate-200 mx-6 md:mx-8" />

              {/* Post-Operative Group */}
              <AccordionItem value="post-op" className="border-b-0 px-6 md:px-8 py-2">
                <AccordionTrigger className="text-lg font-semibold text-slate-800 hover:no-underline py-4">
                  Post-Operative & Safety
                </AccordionTrigger>
                <AccordionContent className="space-y-8 pb-4">
                  {sections.filter(s => ['risk_factors', 'special_instructions', 'post_op_instructions'].includes(s.name)).map(section => (
                    <FormField key={section.name} control={form.control} name={section.name} render={({ field }) => (
                      <FormItem>
                        <Label className="text-base font-semibold text-slate-800 mb-2 block">{section.label}</Label>
                        <FormControl>
                          <RichTextEditor placeholder={section.placeholder} content={field.value || ''} onChange={field.onChange} minHeight="120px" className="bg-white" />
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
