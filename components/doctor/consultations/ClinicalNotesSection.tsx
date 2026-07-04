'use client';

import { FileText, User, Activity, ClipboardList } from 'lucide-react';

interface ClinicalNotesSectionProps {
  notes: {
    title: string;
    content: string | null | undefined;
    icon: 'user' | 'activity' | 'clipboard' | 'fileText';
  }[];
}

export function ClinicalNotesSection({ notes }: ClinicalNotesSectionProps) {
  const iconMap = {
    user: UserIcon,
    activity: ActivityIcon,
    clipboard: ClipboardListIcon,
    fileText: FileTextIcon,
  };

  return (
    <div className="border-2 border-[#e7d6bf] mb-8">
      <div className="bg-[#e7d6bf]/40 px-4 sm:px-6 py-2 border-b border-[#e7d6bf]">
        <h2 className="font-semibold text-[#2c2e4b] flex items-center gap-2">
          <FileText className="h-4 w-4 text-[#caa26a]" />
          CLINICAL NOTES
        </h2>
      </div>
      <div className="p-4 sm:p-6 space-y-6">
        {notes.map((note, index) => {
          const IconComponent = iconMap[note.icon];
          const isEmpty = !note.content || note.content.trim().length === 0;

          return (
            <div
              key={note.title}
              className={index > 0 ? 'pt-4 border-t border-[#e7d6bf]/60' : ''}
            >
              <h3 className="text-sm font-semibold text-[#2c2e4b] uppercase tracking-wider mb-3 flex items-center gap-2">
                {IconComponent && <IconComponent className="h-4 w-4 text-[#caa26a]" />}
                {note.title}
              </h3>
              {isEmpty ? (
                <p className="text-sm text-[#2c2e4b]/40 italic">No documentation recorded</p>
              ) : (
                <div
                  className="text-sm text-[#2c2e4b]/80 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: note.content as string }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H4.5A2.25 2.25 0 002.25 6v11.25a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function ClipboardListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v11.25a2.25 2.25 0 002.25 2.25h.75m9-3.75h.375a.375.375 0 00.375-.375V18a.375.375 0 00-.375-.375h-.375M9 12h6" />
    </svg>
  );
}

function FileTextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}
