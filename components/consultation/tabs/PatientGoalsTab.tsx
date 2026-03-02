'use client';

/**
 * Patient Goals & Aesthetic Concerns Tab - Simplified
 * 
 * Clean, simple interface for documenting aesthetic goals.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { RichTextEditor } from '@/components/consultation/RichTextEditor';
import { X, Edit2, Plus, CheckCircle } from 'lucide-react';
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
];

interface ConcernItem {
    id: string;
    text: string;
    isEditing: boolean;
}

function parseConcernsFromHtml(html: string): ConcernItem[] {
    if (!html) return [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const listItems = doc.querySelectorAll('li, p');
    const concerns: ConcernItem[] = [];
    listItems.forEach((item, index) => {
        const text = item.textContent?.trim() || '';
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
    const [showAddField, setShowAddField] = useState(false);
    const [newConcernText, setNewConcernText] = useState('');

    const isInternalUpdateRef = useRef(false);
    const lastSentValueRef = useRef<string>('');

    useEffect(() => {
        if (isInternalUpdateRef.current) {
            isInternalUpdateRef.current = false;
            return;
        }
        if (initialValue) {
            const parsed = parseConcernsFromHtml(initialValue);
            setConcerns(parsed);
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

    useEffect(() => {
        if (isInternalUpdateRef.current) {
            isInternalUpdateRef.current = false;
            return;
        }
        let newValue: string;
        if (hasNoSpecificConcern) {
            newValue = '<p><em>Routine follow-up / General consultation — no specific aesthetic concerns at this time.</em></p>';
        } else if (concerns.length > 0) {
            const concernsHtml = concernsToHtml(concerns);
            const currentGoals = goals || '';
            const additionalNotes = currentGoals && !currentGoals.includes('<ul>') && !currentGoals.includes('<li>')
                ? currentGoals.trim()
                : '';
            newValue = concernsHtml + (additionalNotes ? `\n\n${additionalNotes}` : '');
        } else {
            newValue = goals || '';
        }
        if (newValue !== lastSentValueRef.current && newValue !== initialValue) {
            isInternalUpdateRef.current = true;
            setGoals(newValue);
            lastSentValueRef.current = newValue;
            onChange(newValue);
        }
    }, [concerns, hasNoSpecificConcern]);

    const handleChange = (value: string) => {
        setGoals(value);
        if (!value.includes('<ul>') && !value.includes('<li>')) {
            if (value !== lastSentValueRef.current) {
                isInternalUpdateRef.current = true;
                lastSentValueRef.current = value;
                onChange(value);
            }
        }
    };

    const addConcern = useCallback((text: string) => {
        const normalized = text.trim().toLowerCase();
        const isDuplicate = concerns.some(c => c.text.trim().toLowerCase() === normalized);
        if (isDuplicate) {
            toast.info('Already added');
            return;
        }
        const newConcern: ConcernItem = {
            id: `concern-${Date.now()}`,
            text: text.trim(),
            isEditing: false,
        };
        setConcerns(prev => [...prev, newConcern]);
        setHasNoSpecificConcern(false);
        setShowAddField(false);
        setNewConcernText('');
        toast.success('Added');
    }, [concerns]);

    const removeConcern = useCallback((id: string) => {
        setConcerns(prev => prev.filter(c => c.id !== id));
    }, []);

    const startEdit = useCallback((concern: ConcernItem) => {
        setEditingId(concern.id);
        setEditText(concern.text);
    }, []);

    const saveEdit = useCallback(() => {
        if (!editingId) return;
        const normalized = editText.trim().toLowerCase();
        const isDuplicate = concerns.some(c => c.id !== editingId && c.text.trim().toLowerCase() === normalized);
        if (isDuplicate) {
            toast.error('Already exists');
            return;
        }
        setConcerns(prev => prev.map(c => c.id === editingId ? { ...c, text: editText.trim() } : c));
        setEditingId(null);
        setEditText('');
    }, [editingId, editText, concerns]);

    const cancelEdit = useCallback(() => {
        setEditingId(null);
        setEditText('');
    }, []);

    const handleNoConcernToggle = useCallback(() => {
        const newValue = !hasNoSpecificConcern;
        setHasNoSpecificConcern(newValue);
        if (newValue) {
            setConcerns([]);
        }
    }, [hasNoSpecificConcern]);

    const handleAddFromDropdown = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        if (value) {
            addConcern(value);
            e.target.value = '';
        }
    };

    if (isReadOnly) {
        return (
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900">Aesthetic Goals & Concerns</h2>
                {goals ? (
                    <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: goals }} />
                ) : (
                    <p className="text-slate-500">No goals recorded.</p>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-slate-900">Aesthetic Goals & Concerns</h2>
                <p className="text-sm text-slate-500">Document the patient's primary aesthetic goals and concerns.</p>
            </div>

            {/* Routine follow-up toggle */}
            <div className="flex items-center gap-3">
                <input
                    type="checkbox"
                    id="no-concern"
                    checked={hasNoSpecificConcern}
                    onChange={handleNoConcernToggle}
                    className="h-4 w-4"
                />
                <label htmlFor="no-concern" className="text-sm text-slate-700">
                    Routine follow-up / General consultation
                </label>
            </div>

            {/* Active concerns */}
            {!hasNoSpecificConcern && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-700">
                            Concerns {concerns.length > 0 && `(${concerns.length})`}
                        </p>
                    </div>

                    {concerns.length > 0 && (
                        <div className="space-y-2">
                            {concerns.map((concern) => (
                                <div
                                    key={concern.id}
                                    className="flex items-center gap-2 p-2 border rounded-lg"
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
                                                className="flex-1 px-2 py-1 text-sm border rounded"
                                                autoFocus
                                            />
                                            <Button size="sm" variant="ghost" onClick={saveEdit}>
                                                <CheckCircle className="h-4 w-4" />
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={cancelEdit}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <span className="flex-1 text-sm text-slate-700">{concern.text}</span>
                                            <Button size="sm" variant="ghost" onClick={() => startEdit(concern)}>
                                                <Edit2 className="h-3 w-3" />
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => removeConcern(concern.id)}>
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Quick add */}
                    <div className="flex items-center gap-2">
                        <select
                            onChange={handleAddFromDropdown}
                            className="flex-1 text-sm border rounded-lg px-3 py-2"
                            defaultValue=""
                        >
                            <option value="">Select common concern...</option>
                            {COMMON_AESTHETIC_CONCERNS.map((concern) => (
                                <option key={concern} value={concern}>
                                    {concern}
                                </option>
                            ))}
                        </select>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAddField(!showAddField)}
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>

                    {showAddField && (
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={newConcernText}
                                onChange={(e) => setNewConcernText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newConcernText.trim()) {
                                        addConcern(newConcernText);
                                    }
                                }}
                                placeholder="Type custom concern..."
                                className="flex-1 text-sm border rounded-lg px-3 py-2"
                                autoFocus
                            />
                            <Button size="sm" onClick={() => newConcernText.trim() && addConcern(newConcernText)}>
                                Add
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Notes editor */}
            <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Notes</p>
                <RichTextEditor
                    content={hasNoSpecificConcern ? '' : goals}
                    onChange={handleChange}
                    placeholder={hasNoSpecificConcern ? "Add notes about this routine follow-up..." : "Add detailed notes about the patient's goals..."}
                    readOnly={isReadOnly}
                    minHeight="200px"
                />
            </div>
        </div>
    );
}
