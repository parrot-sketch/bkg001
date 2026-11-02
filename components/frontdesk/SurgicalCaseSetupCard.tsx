'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SurgicalCaseSetupForm, type SurgicalCaseSetupInitial } from '@/components/frontdesk/SurgicalCaseSetupForm';

interface TeamMemberRecord {
  id?: string;
  role?: string;
  name?: string;
  user_id?: string | null;
  is_external?: boolean;
}

interface SurgicalCaseSetupCardProps {
  caseId: string;
  diagnosis?: string | null;
  primaryOrRevision?: string | null;
  admissionType?: string | null;
  primarySurgeonId?: string | null;
  primarySurgeonName?: string | null;
  teamMembers?: TeamMemberRecord[] | null;
  onSaved?: () => void;
  /** Sit inside a parent record instead of drawing its own panel. */
  embedded?: boolean;
  /** When set, the parent owns whether the editor dialog is open. */
  editing?: boolean;
  onEditingChange?: (open: boolean) => void;
  /** Hide the section button when the parent already offers the action. */
  showAction?: boolean;
}

function setupFromCase(props: SurgicalCaseSetupCardProps): SurgicalCaseSetupInitial {
  const members = props.teamMembers ?? [];
  const assistantRecords = members.filter((member) => member.role === 'ASSISTANT_SURGEON' && member.name);
  const primaryRecord = members.find((member) => member.role === 'SURGEON' && member.name);
  const primaryName = props.primarySurgeonName || primaryRecord?.name || '';

  return {
    diagnosis: props.diagnosis,
    primaryOrRevision: props.primaryOrRevision,
    admissionType: props.admissionType,
    primary: primaryName
      ? { name: primaryName, doctorId: props.primarySurgeonId || undefined }
      : null,
    assistants: assistantRecords.map((member) => ({
      name: member.name || '',
      userId: member.is_external ? undefined : member.user_id || undefined,
    })),
  };
}

export function caseNeedsTeamSetup(props: Pick<SurgicalCaseSetupCardProps, 'primarySurgeonId' | 'primarySurgeonName' | 'diagnosis' | 'admissionType' | 'primaryOrRevision'>): boolean {
  return !props.primarySurgeonId && !props.primarySurgeonName && !props.diagnosis && !props.admissionType && !props.primaryOrRevision;
}

export function SurgicalCaseSetupCard(props: SurgicalCaseSetupCardProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const editing = props.onEditingChange ? Boolean(props.editing) : uncontrolledOpen;
  const setEditing = (open: boolean) => {
    if (props.onEditingChange) props.onEditingChange(open);
    else setUncontrolledOpen(open);
  };
  const openedFromQuery = useRef(false);
  const initial = useMemo(() => setupFromCase(props), [
    props.diagnosis,
    props.primaryOrRevision,
    props.admissionType,
    props.primarySurgeonId,
    props.primarySurgeonName,
    props.teamMembers,
  ]);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('setup') === 'team';
    if (requested && !openedFromQuery.current) {
      openedFromQuery.current = true;
      setEditing(true);
    }
  }, []);

  const assistantRows = (props.teamMembers ?? []).filter((member) => member.role === 'ASSISTANT_SURGEON' && member.name);
  const teamRows: string[][] = [
    ['Primary surgeon', props.primarySurgeonName || 'Not assigned', props.primarySurgeonId ? 'Directory' : props.primarySurgeonName ? 'Named on the case' : '—'],
    ...(assistantRows.length > 0
      ? assistantRows.map((member) => ['Assistant', member.name || '—', member.is_external ? 'External' : 'Directory'])
      : [['Assistant', 'None', '—']]),
  ];

  return (
    <section id="case-team-setup" className={props.embedded ? 'border-b border-border' : 'bg-white border border-border'}>
      <div className="flex items-center justify-between gap-3 border-b-2 border-primary bg-[#e7d6bf]/30 px-5 py-2.5">
        <h2 className="text-sm font-semibold text-primary">Surgical team</h2>
        {props.showAction !== false && (
          <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={() => setEditing(true)}>
            Update
          </Button>
        )}
      </div>
      <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              {['Role', 'Name', 'Source'].map((column) => (
                <TableHead key={column} className="h-9 bg-[#e7d6bf]/30 px-6 text-[11px] font-semibold uppercase tracking-wider text-secondary">
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {teamRows.map((row, index) => (
              <TableRow key={`${row[0]}-${row[1]}-${index}`} className="border-border hover:bg-[#e7d6bf]/30">
                {row.map((cell, cellIndex) => (
                  <TableCell key={cellIndex} className="px-6 py-2.5 text-foreground">{cell}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-none sm:max-w-md sm:rounded-none">
          <DialogHeader>
            <DialogTitle>Surgical team</DialogTitle>
            <DialogDescription>Primary surgeon and assistants for this case.</DialogDescription>
          </DialogHeader>
          <SurgicalCaseSetupForm
            key={`${props.caseId}-${initial.primary?.name ?? ''}-${initial.assistants?.length ?? 0}`}
            fields="team"
            caseId={props.caseId}
            initial={initial}
            cancelLabel="Close"
            onCancel={() => setEditing(false)}
            onSaved={() => {
              setEditing(false);
              props.onSaved?.();
            }}
          />
        </DialogContent>
      </Dialog>
    </section>
  );
}
