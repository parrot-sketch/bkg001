import { format } from 'date-fns';

function displayEnum(raw?: string | null) {
  if (!raw) return '—';
  return raw.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function getAgeYears(dateOfBirth?: string | Date | null): string {
  if (!dateOfBirth) return '—';
  const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
  if (Number.isNaN(dob.getTime())) return '—';
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
  if (age < 0) return '—';
  return `${age} years`;
}

function getInviteName(invites: Array<any>, role: string) {
  const inv = invites.find((i) => i.invited_role === role);
  const u = inv?.invited_user;
  const name = `${u?.first_name || ''} ${u?.last_name || ''}`.trim();
  return name || '—';
}

function NameStack({
  items,
  empty = '—',
}: {
  items: Array<{ name: string; meta?: string | null | undefined }>;
  empty?: string;
}) {
  if (!items.length) return <span>{empty}</span>;
  return (
    <div className="space-y-1">
      {items.map((i, idx) => (
        <div key={`${i.name}-${idx}`} className="flex items-start gap-2">
          <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center border border-slate-200 text-[11px] font-bold tabular-nums text-slate-600">
            {idx + 1}
          </span>
          <div className="leading-snug">
            <span className="font-medium text-slate-900">{i.name}</span>
            {i.meta ? <span className="text-slate-600"> ({i.meta})</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function DocSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 break-inside-avoid">
      <div className="flex items-end justify-between gap-4">
        <h3 className="text-[12px] font-bold uppercase tracking-[0.22em] text-slate-700">{title}</h3>
        <div className="h-px flex-1 bg-slate-200" />
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function InfoTable({ rows }: { rows: Array<{ label: string; value: React.ReactNode }> }) {
  return (
    <table className="w-full text-sm border border-slate-200">
      <tbody className="divide-y divide-slate-200">
        {rows.map((r) => (
          <tr key={r.label}>
            <td className="w-[34%] px-3 py-2.5 align-top text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {r.label}
            </td>
            <td className="px-3 py-2.5 text-slate-900">{r.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function TheaterTechCasePrintDocument(props: {
  caseId: string;
  surgicalCase: any;
  surgeons: Array<{ name: string; specialization?: string | null }>;
  assistantSurgeons: Array<{ name: string; specialization?: string | null }>;
  procedureNames: string[];
}) {
  const { caseId, surgicalCase, surgeons, assistantSurgeons, procedureNames } = props;
  const invites = surgicalCase.staff_invites ?? [];

  return (
    <div className="bg-white text-slate-900" data-case-id={caseId}>
      <style>{`
        @page { size: A4; margin: 14mm; }
        @media print {
          html, body { background: #fff !important; }
        }
      `}</style>

      <div className="mx-auto max-w-[210mm] px-4 py-6 print:px-0 print:py-0">
        {/* Header */}
        <header className="border-b border-slate-200 pb-4">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">
                Theater Department
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
                Surgical Case Summary
              </h1>
              <p className="text-xs text-slate-600 mt-1">
                Patient File No.: <span className="font-mono">{surgicalCase.patient.file_number ?? '—'}</span>
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Status</p>
              <p className="mt-1 inline-flex px-2.5 py-1 text-xs font-bold border border-slate-300 text-slate-800">
                {displayEnum(surgicalCase.status)}
              </p>
              <p className="text-xs text-slate-600 mt-2">
                Generated: {format(new Date(), 'dd MMM yyyy, HH:mm')}
              </p>
            </div>
          </div>
        </header>

        {/* Patient */}
        <DocSection title="Patient Profile">
          <InfoTable
            rows={[
              {
                label: 'Name',
                value: `${surgicalCase.patient.first_name} ${surgicalCase.patient.last_name}`.trim() || '—',
              },
              {
                label: 'Age',
                value: getAgeYears(surgicalCase.patient.date_of_birth),
              },
              { label: 'Sex', value: surgicalCase.patient.gender ?? '—' },
            ]}
          />
        </DocSection>

        {/* Case */}
        <DocSection title="Case Details">
          <InfoTable
            rows={[
              { label: 'Urgency', value: displayEnum(surgicalCase.urgency) },
              {
                label: 'Procedure Date',
                value: surgicalCase.procedure_date
                  ? format(new Date(surgicalCase.procedure_date), 'dd MMM yyyy')
                  : 'Not scheduled',
              },
              { label: 'Category', value: displayEnum(surgicalCase.procedure_category) },
              { label: 'Case Type', value: displayEnum(surgicalCase.primary_or_revision) },
              {
                label: 'Planned Procedures',
                value: procedureNames.length ? procedureNames.join(', ') : '—',
              },
              { label: 'Diagnosis', value: surgicalCase.diagnosis ?? '—' },
            ]}
          />
        </DocSection>

        {/* Team */}
        <DocSection title="Operative Team (Assigned)">
          <InfoTable
            rows={[
              {
                label: 'Primary Surgeon',
                value: surgeons.length ? surgeons[0].name : '—',
              },
              {
                label: 'Assistant Surgeons',
                value: (
                  <NameStack
                    items={assistantSurgeons.map((s) => ({ name: s.name, meta: s.specialization }))}
                  />
                ),
              },
              {
                label: 'Anaesthesiologist',
                value:
                  getInviteName(invites, 'ANESTHESIOLOGIST') !== '—'
                    ? getInviteName(invites, 'ANESTHESIOLOGIST')
                    : getInviteName(invites, 'ANESTHETIST_NURSE'),
              },
              { label: 'Scrub Nurse', value: getInviteName(invites, 'SCRUB_NURSE') },
              { label: 'Circulating Nurse', value: getInviteName(invites, 'CIRCULATING_NURSE') },
              {
                label: 'Other Members',
                value:
                  surgicalCase.team_members?.length
                    ? surgicalCase.team_members
                        .map((m: any) => `${m.name} (${displayEnum(m.role)})`)
                        .join(', ')
                    : '—',
              },
            ]}
          />
        </DocSection>

        {/* Operative details */}
        <DocSection title="Operative Details">
          <InfoTable
            rows={[
              { label: 'Anaesthesia', value: displayEnum(surgicalCase.anaesthesia_type) },
              {
                label: 'Skin-to-Skin',
                value: surgicalCase.skin_to_skin_minutes ? `${surgicalCase.skin_to_skin_minutes} min` : '—',
              },
              {
                label: 'Total Theater',
                value: surgicalCase.total_theatre_minutes ? `${surgicalCase.total_theatre_minutes} min` : '—',
              },
              { label: 'Admission', value: displayEnum(surgicalCase.admission_type) },
            ]}
          />
        </DocSection>

        {/* Items */}
        <DocSection title="Theater Items">
          {surgicalCase.case_items?.length ? (
            <table className="w-full text-sm border border-slate-200">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="text-left px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Item
                  </th>
                  <th className="text-left px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Category
                  </th>
                  <th className="text-right px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 w-20">
                    Qty
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {surgicalCase.case_items.map((item: any) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2.5 font-medium text-slate-900">
                      {item.inventory_item?.name || '—'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700">
                      {item.inventory_item?.category ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold tabular-nums">{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-slate-700">—</p>
          )}
        </DocSection>

        {/* Footer */}
        <footer className="mt-8 pt-4 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between gap-4">
          <span>Created: {format(new Date(surgicalCase.created_at), 'dd MMM yyyy, HH:mm')}</span>
          <span>Last updated: {format(new Date(surgicalCase.updated_at), 'dd MMM yyyy, HH:mm')}</span>
        </footer>
      </div>
    </div>
  );
}
