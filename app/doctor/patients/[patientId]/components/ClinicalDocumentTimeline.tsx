'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow } from 'date-fns';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { VisitCard } from '@/components/patients/patient-page-extras';
import type { VisitResponseDto } from '@/application/dtos/VisitResponseDto';
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
  Calendar,
  NotebookPen,
} from 'lucide-react';

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

const NOTE_TYPES = [
  { value: 'GENERAL', label: 'General', color: 'bg-slate-100 text-slate-700' },
  { value: 'ASSESSMENT', label: 'Assessment', color: 'bg-violet-100 text-violet-700' },
  { value: 'PROGRESS', label: 'Progress', color: 'bg-blue-100 text-blue-700' },
  { value: 'PROCEDURE', label: 'Procedure', color: 'bg-amber-100 text-amber-700' },
  { value: 'FOLLOW_UP', label: 'Follow-up', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'REFERRAL', label: 'Referral', color: 'bg-rose-100 text-rose-700' },
];

interface ClinicalDocumentTimelineProps {
  patientId: string;
  visits: VisitResponseDto[];
}

type TimelineItem =
  | { type: 'visit'; id: string; date: Date; raw: VisitResponseDto }
  | { type: 'note'; id: string; date: Date; raw: ClinicalNote };

export function ClinicalDocumentTimeline({ patientId, visits }: ClinicalDocumentTimelineProps) {
  const router = useRouter();
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [deletingNoteId, setDeletingNoteId] = useState<number | null>(null);

  const loadNotes = useCallback(async () => {
    try {
      const response = await apiClient.get<ClinicalNote[]>(
        `/patients/${patientId}/clinical-notes`
      );
      if (response.success && response.data) {
        setNotes(response.data);
      }
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setNotesLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleUpdate = async (noteId: number, data: { content?: string; title?: string; noteType?: string; isPinned?: boolean }) => {
    try {
      const response = await apiClient.put<{ id: number; updatedAt: string }>(
        `/clinical-notes/${noteId}`, data
      );
      if (response.success) {
        toast.success('Note updated');
        await loadNotes();
      } else {
        toast.error(response.error || 'Failed to update note');
      }
    } catch {
      toast.error('Failed to update note');
    }
  };

  const handleDelete = async (noteId: number) => {
    setDeletingNoteId(noteId);
    try {
      const response = await apiClient.delete<void>(`/clinical-notes/${noteId}`);
      if (response.success) {
        toast.success('Note removed');
        setNotes(prev => prev.filter(n => n.id !== noteId));
      } else {
        toast.error(response.error || 'Failed to delete note');
      }
    } catch {
      toast.error('Failed to delete note');
    } finally {
      setDeletingNoteId(null);
    }
  };

  // Compile chronological timeline
  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = [];

    // Add visits
    visits.forEach(v => {
      items.push({
        type: 'visit',
        id: `visit-${v.id}`,
        date: new Date(v.date),
        raw: v,
      });
    });

    // Add general/unpinned notes
    notes.filter(n => !n.isPinned).forEach(n => {
      items.push({
        type: 'note',
        id: `note-${n.id}`,
        date: new Date(n.createdAt),
        raw: n,
      });
    });

    // Sort descending by date
    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [visits, notes]);

  const pinnedNotes = useMemo(() => {
    return notes.filter(n => n.isPinned);
  }, [notes]);

  if (notesLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="border border-slate-200 bg-white p-4 space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Feed Controls Header */}
      <div className="flex items-center justify-between border-b border-slate-250 pb-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Clinical Chart Feed</h2>
          <p className="text-xs text-slate-400 mt-0.5">Chronological visits and observations history</p>
        </div>
        <Button
          size="sm"
          onClick={() => router.push(`/doctor/patients/${patientId}/notes/new`)}
          className="h-8 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded"
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Observation
        </Button>
      </div>

      {/* Pinned Alerts / Important Notes (Sticky Top Section) */}
      {pinnedNotes.length > 0 && (
        <div className="bg-amber-50/40 border border-amber-200/60 p-5 rounded space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-850 uppercase tracking-wider">
            <Pin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            Pinned Clinical Bulletins
          </div>
          <div className="space-y-3">
            {pinnedNotes.map(note => (
              <NoteCard
                key={note.id}
                note={note}
                patientId={patientId}
                onDelete={() => handleDelete(note.id)}
                onTogglePin={() => handleUpdate(note.id, { isPinned: false })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Longitudinal Timeline List */}
      <div className="relative border-l border-slate-200 ml-4 pl-6 space-y-6">
        {timelineItems.length === 0 ? (
          <div className="-ml-10 flex flex-col items-center justify-center py-16 bg-white border border-dashed border-slate-200 rounded">
            <FileText className="h-8 w-8 text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-600">No medical events recorded</p>
            <p className="text-xs text-slate-400 mt-1">Timeline is empty for this patient record.</p>
          </div>
        ) : (
          timelineItems.map((item) => (
            <div key={item.id} className="relative">
              {/* Timeline Bullet Anchor */}
              <div className="absolute -left-[31px] top-1.5 bg-white border-2 border-slate-200 rounded-full h-3.5 w-3.5 flex items-center justify-center z-10">
                <div className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  item.type === 'visit' ? 'bg-blue-600' : 'bg-stone-500'
                )} />
              </div>

              {/* Document Entry */}
              {item.type === 'visit' ? (
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    Visit Record
                  </div>
                  <VisitCard visit={item.raw} patientId={patientId} />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider font-mono flex items-center gap-1">
                    <NotebookPen className="h-3 w-3 text-stone-400" />
                    Doctor Observation Note
                  </div>
                  <NoteCard
                    note={item.raw}
                    patientId={patientId}
                    onDelete={() => handleDelete(item.raw.id)}
                    onTogglePin={() => handleUpdate(item.raw.id, { isPinned: !item.raw.isPinned })}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Note Card ────────────────────────────────────────────────

interface NoteCardProps {
  note: ClinicalNote;
  patientId: string;
  onDelete: () => void;
  onTogglePin: () => void;
}

function NoteCard({ note, patientId, onDelete, onTogglePin }: NoteCardProps) {
  const router = useRouter();
  const typeConfig = NOTE_TYPES.find(t => t.value === note.noteType) || NOTE_TYPES[0];

  return (
    <div className={cn(
      'border rounded p-4 bg-white transition-colors relative hover:border-slate-300',
      note.isPinned ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200',
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          {note.title && (
            <h4 className="text-xs font-bold text-slate-800">{note.title}</h4>
          )}
          <Badge variant="outline" className={cn('text-[9px] font-extrabold uppercase py-0.5 px-2 tracking-wider border-0 rounded', typeConfig.color)}>
            {typeConfig.label}
          </Badge>
          {note.isPinned && <Pin className="h-3 w-3 text-amber-500" />}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-700 rounded-full">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36 rounded border-slate-200 text-xs">
            <DropdownMenuItem
              onClick={() => router.push(`/doctor/patients/${patientId}/notes/${note.id}/edit`)}
              className="gap-2 cursor-pointer"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit Note
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onTogglePin} className="gap-2 cursor-pointer">
              {note.isPinned ? (
                <><PinOff className="h-3.5 w-3.5" /> Unpin Note</>
              ) : (
                <><Pin className="h-3.5 w-3.5" /> Pin Note</>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-rose-600 focus:text-rose-600 gap-2 cursor-pointer">
              <Trash2 className="h-3.5 w-3.5" /> Delete Note
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      <div
        className="text-xs text-slate-700 leading-relaxed prose prose-sm prose-slate max-w-none [&>p]:my-1 [&>ul]:my-1"
        dangerouslySetInnerHTML={{ __html: note.content }}
      />

      {/* Footer metadata */}
      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
        <span>Dr. {note.author?.name || 'Practitioner'}</span>
        <span>·</span>
        <span>
          {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
        </span>
        {note.updatedAt !== note.createdAt && (
          <>
            <span>·</span>
            <span className="italic text-[9px] text-slate-400">
              (edited {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })})
            </span>
          </>
        )}
      </div>
    </div>
  );
}
