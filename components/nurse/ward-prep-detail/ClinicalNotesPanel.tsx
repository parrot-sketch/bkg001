'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Loader2, Save } from 'lucide-react';

export function ClinicalNotesPanel(props: {
  initialPreOpNotes: string;
  initialRiskFactors: string;
  onSave: (payload: { preOpNotes: string; riskFactors: string }) => Promise<void>;
  isSaving: boolean;
}) {
  const { initialPreOpNotes, initialRiskFactors, onSave, isSaving } = props;

  const [editingNotes, setEditingNotes] = useState(false);
  const [preOpNotes, setPreOpNotes] = useState('');
  const [riskFactors, setRiskFactors] = useState('');

  useEffect(() => {
    // Keep behavior: fields populate from case plan when edit starts.
    if (!editingNotes) return;
    setPreOpNotes(initialPreOpNotes || '');
    setRiskFactors(initialRiskFactors || '');
  }, [editingNotes, initialPreOpNotes, initialRiskFactors]);

  const handleSave = async () => {
    try {
      await onSave({ preOpNotes, riskFactors });
      toast.success('Notes saved successfully');
      setEditingNotes(false);
    } catch {
      toast.error('Failed to save notes');
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">Clinical Notes & Assessment</h3>
        </div>
        {!editingNotes && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditingNotes(true)}
            className="h-8 border-slate-200 bg-white hover:bg-slate-50"
          >
            <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit
          </Button>
        )}
      </div>

      <CardContent className="p-6">
        {editingNotes ? (
          <div className="space-y-4 animate-in fade-in">
            <div>
              <Label htmlFor="preOpNotes" className="text-slate-700">
                Pre-Op Notes
              </Label>
              <Textarea
                id="preOpNotes"
                value={preOpNotes}
                onChange={(e) => setPreOpNotes(e.target.value)}
                placeholder="Enter pre-operative assessment notes..."
                className="mt-2 min-h-[120px] bg-white"
              />
            </div>
            <div>
              <Label htmlFor="riskFactors" className="text-slate-700">
                Risk Factors
              </Label>
              <Textarea
                id="riskFactors"
                value={riskFactors}
                onChange={(e) => setRiskFactors(e.target.value)}
                placeholder="Document any risk factors (e.g. allergies, previous complications)..."
                className="mt-2 min-h-[120px] bg-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingNotes(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="bg-slate-900 hover:bg-slate-800">
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Notes
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Pre-Op Notes</h4>
              <div
                className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed prose prose-sm max-w-none"
                // Keep existing behavior: notes are rendered as HTML if present.
                dangerouslySetInnerHTML={{
                  __html: initialPreOpNotes || '<span class="text-slate-400 italic">No notes recorded yet.</span>',
                }}
              />
            </div>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Risk Factors</h4>
              <div
                className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{
                  __html: initialRiskFactors || '<span class="text-slate-400 italic">No risk factors documented.</span>',
                }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

