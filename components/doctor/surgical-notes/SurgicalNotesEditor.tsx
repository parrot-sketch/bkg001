import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Save, FileText, CheckCircle2 } from 'lucide-react';
import { RichTextEditor } from '@/components/consultation/RichTextEditor';
import { SurgicalNotesView } from './SurgicalNotesView';

interface SurgicalNotesFields {
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
  onContinue?: () => void;
}

export function SurgicalNotesEditor({ caseId, onContinue }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState('');
  const [notesData, setNotesData] = useState<SurgicalNotesFields | null>(null);

  const consolidateNotes = useCallback((data: SurgicalNotesFields) => {
    // If we already have a surgeon narrative, just use that as the master document
    if (data.surgeon_narrative && data.surgeon_narrative.trim().length > 0) {
      return data.surgeon_narrative;
    }

    // Otherwise, generate a consolidated document from the sub-sections
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
      .map(s => `<h2>${s.label}</h2>${s.value}`)
      .join('<br/>');

    return html;
  }, []);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/doctor/surgical-cases/${caseId}/notes`);
      const json = await res.json();
      
      if (json.success && json.data) {
        setNotesData(json.data);
        const consolidated = consolidateNotes(json.data);
        setContent(consolidated);
        
        if (!consolidated || consolidated.trim().length === 0) {
            setIsEditing(true);
        }
      } else {
        setIsEditing(true);
      }
    } catch (err) {
      console.error('Failed to load surgical notes', err);
      setError('Failed to load existing notes.');
    } finally {
      setIsLoading(false);
    }
  }, [caseId, consolidateNotes]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const onSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setError(null);
    
    try {
      const res = await fetch(`/api/doctor/surgical-cases/${caseId}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to save notes');
      
      setSaveSuccess(true);
      setNotesData({ ...notesData, surgeon_narrative: content });
      
      setTimeout(() => {
          setSaveSuccess(false);
          setIsEditing(false);
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
           <p className="mt-4 text-sm text-slate-500 font-medium">Preparing clinical document...</p>
        </CardContent>
      </Card>
    );
  }

  if (!isEditing && notesData && content) {
      return (
          <SurgicalNotesView 
              caseId={caseId} 
              data={notesData} 
              onEdit={() => setIsEditing(true)} 
              onContinue={onContinue}
          />
      );
  }

  return (
    <Card className="shadow-sm border-slate-200 w-full animate-in fade-in duration-300 mb-8 overflow-hidden bg-white">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 px-4 md:px-6 gap-3">
        <CardTitle className="flex items-center gap-2 text-base md:text-lg text-slate-800">
           <FileText className="h-4 w-4 md:h-5 md:w-5 text-slate-500" />
           Surgical Case Narrative
        </CardTitle>
        
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
           {error && <span className="text-xs font-medium text-destructive truncate">{error}</span>}
           {saveSuccess && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                <CheckCircle2 className="h-3 w-3" />
                Saved
              </span>
           )}
           {content && (
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
             onClick={onSave} 
             disabled={isSaving}
             className="bg-slate-900 text-white shadow-none h-8 px-3 text-xs md:text-sm md:h-9 font-bold"
           >
             {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
             Save Narrative
           </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 md:p-6 lg:p-8">
        <RichTextEditor 
            placeholder="Start writing the surgical narrative, findings, and plan here..." 
            content={content} 
            onChange={setContent} 
            minHeight="600px" 
            className="bg-white" 
        />
      </CardContent>
    </Card>
  );
}
