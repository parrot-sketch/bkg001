'use client';

/**
 * Patient Goals & Aesthetic Concerns Tab
 * 
 * Enhanced UX for aesthetic surgery consultations:
 * - Editable quick-add items (can modify or remove after adding)
 * - Prevents duplicate concerns
 * - Supports cases with no specific concerns (routine follow-up, general consultation)
 * - Structured list management with visual feedback
 * 
 * Auto-saves via parent context — no per-tab save button needed.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { RichTextEditor } from '@/components/consultation/RichTextEditor';
import { FileText, X, Edit2, Plus, Sparkles, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PatientGoalsTabProps {
  initialValue?: string;
  onChange: (value: string) => void;
  isReadOnly?: boolean;
}

const COMMON_AESTHETIC_CONCERNS = [
  'Facial rejuvenation',
  'Body contouring',
  'Breast enhancement',
  'Rhinoplasty',
  'Skin tightening',
  'Scar revision',
  'Liposuction',
  'Tummy tuck',
  'Botox & Fillers',
  'Hair restoration',
  'Laser treatments',
  'Non-surgical facelift',
];

interface ConcernItem {
  id: string;
  text: string;
  isEditing: boolean;
}

/**
 * Parse HTML content to extract concern items
 */
function parseConcernsFromHtml(html: string): ConcernItem[] {
  if (!html) return [];
  
  // Extract list items from HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const listItems = doc.querySelectorAll('li, p');
  
  const concerns: ConcernItem[] = [];
  listItems.forEach((item, index) => {
    const text = item.textContent?.trim() || '';
    // Remove bullet points and common prefixes
    const cleanText = text.replace(/^[•\-\*]\s*/, '').trim();
    if (cleanText && cleanText.length > 0) {
      concerns.push({
        id: `concern-${index}-${Date.now()}`,
        text: cleanText,
        isEditing: false,
      });
    }
  });
  
  return concerns;
}

/**
 * Convert concerns array to HTML
 */
function concernsToHtml(concerns: ConcernItem[]): string {
  if (concerns.length === 0) return '';
  
  const items = concerns.map(c => `<li>${c.text}</li>`).join('\n');
  return `<ul>${items}</ul>`;
}

export function PatientGoalsTab({
  initialValue = '',
  onChange,
  isReadOnly = false,
}: PatientGoalsTabProps) {
  const [goals, setGoals] = useState(initialValue);
  const [concerns, setConcerns] = useState<ConcernItem[]>([]);
  const [hasNoSpecificConcern, setHasNoSpecificConcern] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  
  // Ref to track if we're updating from internal changes (to prevent loops)
  const isInternalUpdateRef = useRef(false);
  const lastSentValueRef = useRef<string>('');

  // Parse initial value to extract concerns (only when initialValue changes externally)
  useEffect(() => {
    // Skip if this is an internal update
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }

    if (initialValue) {
      const parsed = parseConcernsFromHtml(initialValue);
      setConcerns(parsed);
      // Check if there's a "no specific concern" indicator
      const lowerValue = initialValue.toLowerCase();
      setHasNoSpecificConcern(
        lowerValue.includes('no specific') ||
        lowerValue.includes('routine follow-up') ||
        lowerValue.includes('general consultation')
      );
    } else {
      setConcerns([]);
      setHasNoSpecificConcern(false);
    }
    setGoals(initialValue);
    lastSentValueRef.current = initialValue;
  }, [initialValue]);

  // Update parent when concerns or hasNoSpecificConcern change (but not goals to avoid loops)
  useEffect(() => {
    // Skip if this is triggered by initialValue change (we're syncing from parent)
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }

    let newValue: string;
    
    if (hasNoSpecificConcern) {
      newValue = '<p><em>Routine follow-up / General consultation — no specific aesthetic concerns at this time.</em></p>';
    } else if (concerns.length > 0) {
      const concernsHtml = concernsToHtml(concerns);
      // Preserve any additional notes that aren't part of the concerns list
      // Use current goals state (captured in closure)
      const currentGoals = goals || '';
      const additionalNotes = currentGoals && !currentGoals.includes('<ul>') && !currentGoals.includes('<li>') 
        ? currentGoals.trim() 
        : '';
      newValue = concernsHtml + (additionalNotes ? `\n\n${additionalNotes}` : '');
    } else {
      // If no concerns and not "no concern", keep current goals or empty
      newValue = goals || '';
    }

    // Only update if the value actually changed from what we last sent AND from initialValue
    // This prevents loops: if newValue === initialValue, we're in sync and don't need to update
    if (newValue !== lastSentValueRef.current && newValue !== initialValue) {
      // Set flag BEFORE calling onChange to prevent loop
      isInternalUpdateRef.current = true;
      setGoals(newValue);
      lastSentValueRef.current = newValue;
      onChange(newValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concerns, hasNoSpecificConcern]);

  const handleChange = (value: string) => {
    setGoals(value);
    // Only call onChange if user is manually editing (not from structured concerns)
    // This prevents loops when user types in the rich text editor
    if (!value.includes('<ul>') && !value.includes('<li>')) {
      if (value !== lastSentValueRef.current) {
        isInternalUpdateRef.current = true;
        lastSentValueRef.current = value;
        onChange(value);
      }
    }
  };

  const addConcern = useCallback((text: string) => {
    // Check for duplicates
    const normalized = text.trim().toLowerCase();
    const isDuplicate = concerns.some(
      c => c.text.trim().toLowerCase() === normalized
    );

    if (isDuplicate) {
      toast.info('This concern is already added');
      return;
    }

    const newConcern: ConcernItem = {
      id: `concern-${Date.now()}-${Math.random()}`,
      text: text.trim(),
      isEditing: false,
    };

    setConcerns(prev => [...prev, newConcern]);
    setHasNoSpecificConcern(false); // Clear "no concern" if adding a concern
    toast.success('Concern added');
  }, [concerns]);

  const removeConcern = useCallback((id: string) => {
    setConcerns(prev => prev.filter(c => c.id !== id));
    toast.success('Concern removed');
  }, []);

  const startEdit = useCallback((concern: ConcernItem) => {
    setEditingId(concern.id);
    setEditText(concern.text);
  }, []);

  const saveEdit = useCallback(() => {
    if (!editingId) return;

    const normalized = editText.trim().toLowerCase();
    const isDuplicate = concerns.some(
      c => c.id !== editingId && c.text.trim().toLowerCase() === normalized
    );

    if (isDuplicate) {
      toast.error('This concern already exists');
      return;
    }

    setConcerns(prev =>
      prev.map(c =>
        c.id === editingId ? { ...c, text: editText.trim(), isEditing: false } : c
      )
    );
    setEditingId(null);
    setEditText('');
    toast.success('Concern updated');
  }, [editingId, editText, concerns]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditText('');
  }, []);

  const handleNoConcernToggle = useCallback(() => {
    const newValue = !hasNoSpecificConcern;
    setHasNoSpecificConcern(newValue);
    if (newValue) {
      setConcerns([]); // Clear concerns when marking as "no specific concern"
      toast.success('Marked as routine follow-up');
    }
  }, [hasNoSpecificConcern]);

  return (
    <div className="p-5 lg:p-6 max-w-4xl mx-auto space-y-6">
      {/* Section header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-4 w-4 text-indigo-500" />
          <h2 className="text-sm font-semibold text-slate-900">Aesthetic Goals & Concerns</h2>
        </div>
        <p className="text-xs text-slate-500 ml-6">
          Document the patient's primary aesthetic goals, concerns, and desired outcomes for this consultation.
        </p>
      </div>

      {/* Read Mode or Editor */}
      {isReadOnly ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
          <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Recorded Assessment</span>
            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
          </div>
          <div className="p-8">
            {goals ? (
              <div
                className="prose prose-slate prose-sm max-w-none prose-p:text-slate-700 prose-p:leading-relaxed prose-p:text-base prose-ul:text-slate-700"
                dangerouslySetInnerHTML={{ __html: goals }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100 text-slate-300">
                  <FileText className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-slate-400">No goals or concerns recorded during this session</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* No Specific Concern Toggle */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50/50 border border-amber-100">
            <input
              type="checkbox"
              id="no-concern"
              checked={hasNoSpecificConcern}
              onChange={handleNoConcernToggle}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label
              htmlFor="no-concern"
              className="text-sm font-medium text-slate-700 cursor-pointer flex-1"
            >
              Routine follow-up / General consultation — no specific aesthetic concerns at this time
            </label>
          </div>

          {/* Concerns List (only show if not "no concern") */}
          {!hasNoSpecificConcern && (
            <div className="space-y-4">
              {/* Active Concerns List */}
              {concerns.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Active Concerns ({concerns.length})
                  </p>
                  <div className="space-y-2">
                    {concerns.map((concern) => (
                      <div
                        key={concern.id}
                        className="group flex items-center gap-2 p-3 rounded-lg border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30 transition-all"
                      >
                        {editingId === concern.id ? (
                          <>
                            <input
                              type="text"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit();
                                if (e.key === 'Escape') cancelEdit();
                              }}
                              className="flex-1 px-3 py-1.5 text-sm border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={saveEdit}
                              className="h-8 w-8 p-0"
                            >
                              <CheckCircle className="h-4 w-4 text-emerald-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelEdit}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4 text-slate-400" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <div className="flex-1 text-sm text-slate-700 font-medium">
                              {concern.text}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEdit(concern)}
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Edit2 className="h-4 w-4 text-slate-400 hover:text-indigo-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeConcern(concern.id)}
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-4 w-4 text-slate-400 hover:text-red-600" />
                            </Button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick-add concern chips */}
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 shadow-sm">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Plus className="h-3 w-3" />
                  Quick Add — Common Aesthetic Concerns
                </p>
                <div className="flex flex-wrap gap-2">
                  {COMMON_AESTHETIC_CONCERNS.map((concern) => {
                    const isAdded = concerns.some(
                      c => c.text.trim().toLowerCase() === concern.toLowerCase()
                    );
                    return (
                      <button
                        key={concern}
                        type="button"
                        onClick={() => addConcern(concern)}
                        disabled={isAdded}
                        className={cn(
                          "text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all shadow-sm",
                          isAdded
                            ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 hover:shadow-md"
                        )}
                      >
                        {concern}
                        {isAdded && (
                          <CheckCircle className="h-3 w-3 inline-block ml-1.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Rich Text Editor for Additional Notes */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Additional Notes & Details
            </p>
            <RichTextEditor
              content={hasNoSpecificConcern ? '' : goals}
              onChange={handleChange}
              placeholder={
                hasNoSpecificConcern
                  ? "Add any additional notes about this routine follow-up consultation…"
                  : "Add detailed notes, patient expectations, or any additional context about their aesthetic goals…"
              }
              readOnly={isReadOnly}
              minHeight="250px"
            />
          </div>
        </>
      )}
    </div>
  );
}
