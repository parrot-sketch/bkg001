'use client';

/**
 * ClinicalNotesTab — Doctor's clinical notes for a patient
 *
 * Features:
 * - Rich text editor (Tiptap) for creating notes
 * - Note types: General, Assessment, Progress, Procedure, Follow-up, Referral
 * - Pin important notes
 * - Edit/delete own notes
 * - Timestamps with relative dates
 */

import { useState, useEffect, useCallback } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { RichTextEditor } from '@/components/consultation/RichTextEditor';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileText,
  Plus,
  Pin,
  PinOff,
  MoreVertical,
  Pencil,
  Trash2,
  X,
  Check,
  Loader2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────

interface ClinicalNote {
  id: number;
  noteType: string;
  title: string | null;
  content: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  appointmentId: number | null;
  appointment: { id: number; date: string; time: string; type: string } | null;
  author: { id: string; name: string };
}

const NOTE_TYPES: { value: string; label: string; color: string }[] = [
  { value: 'GENERAL', label: 'General', color: 'bg-slate-100 text-slate-700' },
  { value: 'ASSESSMENT', label: 'Assessment', color: 'bg-violet-100 text-violet-700' },
  { value: 'PROGRESS', label: 'Progress', color: 'bg-blue-100 text-blue-700' },
  { value: 'PROCEDURE', label: 'Procedure', color: 'bg-amber-100 text-amber-700' },
  { value: 'FOLLOW_UP', label: 'Follow-up', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'REFERRAL', label: 'Referral', color: 'bg-rose-100 text-rose-700' },
];

// ─── Component ────────────────────────────────────────────────

interface ClinicalNotesTabProps {
  patientId: string;
}

export function ClinicalNotesTab({ patientId }: ClinicalNotesTabProps) {
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<ClinicalNote | null>(null);

  const loadNotes = useCallback(async () => {
    try {
      const response = await apiClient.get<ClinicalNote[]>(
        `/patients/${patientId}/clinical-notes`
      );
      if (response.success && response.data) {
        setNotes(response.data);
      } else if (!response.success) {
        console.error('Failed to load clinical notes:', response.error);
      }
    } catch (error) {
      console.error('Failed to load clinical notes:', error);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleCreate = async (noteData: { title: string; noteType: string; content: string }) => {
    try {
      const response = await apiClient.post<{ id: number; createdAt: string }>(
        `/patients/${patientId}/clinical-notes`, noteData
      );
      if (response.success) {
        toast.success('Note created');
        await loadNotes();
        setShowEditor(false);
      } else {
        toast.error(response.error || 'Failed to create note');
      }
    } catch {
      toast.error('Failed to create note');
    }
  };

  const handleUpdate = async (noteId: number, data: { content?: string; title?: string; noteType?: string; isPinned?: boolean }) => {
    try {
      const response = await apiClient.put<{ id: number; updatedAt: string }>(
        `/clinical-notes/${noteId}`, data
      );
      if (response.success) {
        toast.success('Note updated');
        await loadNotes();
        setEditingNote(null);
      } else {
        toast.error(response.error || 'Failed to update note');
      }
    } catch {
      toast.error('Failed to update note');
    }
  };

  const handleDelete = async (noteId: number) => {
    try {
      const response = await apiClient.delete<void>(`/clinical-notes/${noteId}`);
      if (response.success) {
        toast.success('Note deleted');
        setNotes(prev => prev.filter(n => n.id !== noteId));
      } else {
        toast.error(response.error || 'Failed to delete note');
      }
    } catch {
      toast.error('Failed to delete note');
    }
  };

  const handleTogglePin = async (note: ClinicalNote) => {
    await handleUpdate(note.id, { isPinned: !note.isPinned });
  };

  const pinnedNotes = notes.filter(n => n.isPinned);
  const unpinnedNotes = notes.filter(n => !n.isPinned);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-stone-800">Clinical Notes</h3>
          <p className="text-xs text-stone-400">
            {notes.length} note{notes.length !== 1 ? 's' : ''} · Your personal clinical observations
          </p>
        </div>
        {!showEditor && !editingNote && (
          <Button
            size="sm"
            onClick={() => { setShowEditor(true); setEditingNote(null); }}
            className="h-8 text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Note
          </Button>
        )}
      </div>

      {/* Editor */}
      {(showEditor || editingNote) && (
        <NoteEditor
          note={editingNote}
          onSave={editingNote
            ? (data) => handleUpdate(editingNote.id, data)
            : handleCreate
          }
          onCancel={() => { setShowEditor(false); setEditingNote(null); }}
        />
      )}

      {/* Notes list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="border rounded-lg p-4 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-dashed border-stone-200">
          <FileText className="h-8 w-8 text-stone-300 mb-3" />
          <p className="text-sm font-medium text-stone-600">No clinical notes yet</p>
          <p className="text-xs text-stone-400 mt-1">Write notes about this patient&apos;s care.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Pinned */}
          {pinnedNotes.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider flex items-center gap-1">
                <Pin className="h-3 w-3" /> Pinned
              </p>
              {pinnedNotes.map(note => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onEdit={() => { setEditingNote(note); setShowEditor(false); }}
                  onDelete={() => handleDelete(note.id)}
                  onTogglePin={() => handleTogglePin(note)}
                />
              ))}
            </div>
          )}

          {/* Unpinned */}
          {unpinnedNotes.length > 0 && (
            <div className="space-y-2">
              {pinnedNotes.length > 0 && (
                <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">All Notes</p>
              )}
              {unpinnedNotes.map(note => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onEdit={() => { setEditingNote(note); setShowEditor(false); }}
                  onDelete={() => handleDelete(note.id)}
                  onTogglePin={() => handleTogglePin(note)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Note Editor ──────────────────────────────────────────────

interface NoteEditorProps {
  note: ClinicalNote | null;
  onSave: (data: { title: string; noteType: string; content: string }) => void;
  onCancel: () => void;
}

function NoteEditor({ note, onSave, onCancel }: NoteEditorProps) {
  const [title, setTitle] = useState(note?.title || '');
  const [noteType, setNoteType] = useState(note?.noteType || 'GENERAL');
  const [content, setContent] = useState(note?.content || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error('Note content cannot be empty');
      return;
    }
    setSaving(true);
    await onSave({ title: title.trim() || '', noteType, content });
    setSaving(false);
  };

  return (
    <div className="border rounded-xl bg-white p-4 space-y-3 shadow-sm">
      {/* Title + Type */}
      <div className="flex items-center gap-3">
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Note title (optional)"
          className="h-8 text-sm flex-1"
        />
        <select
          value={noteType}
          onChange={e => setNoteType(e.target.value)}
          className="h-8 text-xs border border-stone-200 rounded-md px-2 bg-white"
        >
          {NOTE_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Rich text editor */}
      <RichTextEditor
        content={content}
        onChange={setContent}
        placeholder="Write your clinical note..."
        minHeight="160px"
      />

      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving} className="h-8 text-xs">
          <X className="h-3.5 w-3.5 mr-1" /> Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving} className="h-8 text-xs">
          {saving ? (
            <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Saving...</>
          ) : (
            <><Check className="h-3.5 w-3.5 mr-1" /> {note ? 'Update' : 'Save'} Note</>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Note Card ────────────────────────────────────────────────

interface NoteCardProps {
  note: ClinicalNote;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}

function NoteCard({ note, onEdit, onDelete, onTogglePin }: NoteCardProps) {
  const typeConfig = NOTE_TYPES.find(t => t.value === note.noteType) || NOTE_TYPES[0];

  return (
    <div className={cn(
      'border rounded-lg p-4 bg-white hover:border-stone-300 transition-colors',
      note.isPinned && 'border-amber-200 bg-amber-50/30',
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          {note.title && (
            <h4 className="text-sm font-semibold text-stone-800">{note.title}</h4>
          )}
          <Badge variant="outline" className={cn('text-[10px] font-bold py-0 px-2 border-0', typeConfig.color)}>
            {typeConfig.label}
          </Badge>
          {note.isPinned && <Pin className="h-3 w-3 text-amber-500" />}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-stone-300 hover:text-stone-600">
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onTogglePin}>
              {note.isPinned
                ? <><PinOff className="h-3.5 w-3.5 mr-2" /> Unpin</>
                : <><Pin className="h-3.5 w-3.5 mr-2" /> Pin</>
              }
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-rose-600 focus:text-rose-600">
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content (rendered HTML from rich text editor) */}
      <div
        className="text-sm text-stone-700 prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0"
        dangerouslySetInnerHTML={{ __html: note.content }}
      />

      {/* Footer */}
      <div className="flex items-center gap-3 mt-3 pt-2 border-t border-stone-100">
        <span className="text-[10px] text-stone-400">
          {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
        </span>
        {note.updatedAt !== note.createdAt && (
          <span className="text-[10px] text-stone-300">
            (edited {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })})
          </span>
        )}
        {note.appointment && (
          <span className="text-[10px] text-stone-400">
            · {format(new Date(note.appointment.date), 'MMM d')} {note.appointment.time}
          </span>
        )}
      </div>
    </div>
  );
}
