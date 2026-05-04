import { FileText, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

function stripHtml(html: string) {
  return (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function OperativeRecordPrintDocument(props: {
  operativeStatus: string;
  operativeSignedAt: Date | null;
  data: any;
  surgicalCase: any;
}) {
  const { operativeStatus, operativeSignedAt, data, surgicalCase } = props;

  const today = format(new Date(), 'dd MMM yyyy, HH:mm');
  const patient = surgicalCase.patient;
  const patientAge = patient.date_of_birth
    ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()
    : null;

  const fullName = (u: any) => `${u?.first_name || ''} ${u?.last_name || ''}`.trim();
  const getInviteName = (role: string) =>
    fullName(surgicalCase.staff_invites.find((i: any) => i.invited_role === role)?.invited_user);

  const assistants = surgicalCase.staff_invites
    .filter((i: any) => i.invited_role === 'ASSISTANT_SURGEON')
    .map((i: any) => fullName(i.invited_user))
    .filter(Boolean);

  const scrubNurse = getInviteName('SCRUB_NURSE');
  const circulatingNurse = getInviteName('CIRCULATING_NURSE');
  const anesth = getInviteName('ANESTHESIOLOGIST') || getInviteName('ANESTHETIST_NURSE');

  const header = data.header ?? {};
  const findingsAndSteps = data.findingsAndSteps ?? {};
  const counts = data.countsConfirmation ?? {};
  const opRec = data.operativeRecord ?? {};

  const surgeonName = surgicalCase.primary_surgeon?.name || header.surgeonName || '';

  const procedureNotesHtml = findingsAndSteps.operativeSteps ?? '';
  const operationRecordHtml = opRec.operationRecord ?? '';
  const postOpInstructionsHtml = opRec.postOperativeInstructions ?? '';

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8 print:p-0 print:bg-white font-sans">
      <div className="max-w-4xl mx-auto bg-white shadow-lg print:shadow-none p-10 md:p-14 print:p-8 text-slate-800">
        {/* Action Bar (Hidden when printing) */}
        <div className="flex items-center justify-between mb-8 print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <FileText className="h-6 w-6 text-slate-500" />
              Operative Record Export
            </h1>
            <p className="text-sm text-slate-500 mt-1">Generated on {today}</p>
          </div>
        </div>

      {/* Page 1 */}
      <div className="print-area">
        <header className="border-b-2 border-slate-900 pb-6 mb-8 flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 uppercase">
              NAIROBI SCULPT AESTHETIC CENTRE
            </h2>
            <p className="text-sm text-slate-500 font-medium tracking-wide uppercase">
              OPERATION RECORD
            </p>
          </div>
          <div className="text-right text-xs text-slate-500 space-y-1">
            <p>Status: {operativeStatus}</p>
            {operativeSignedAt && (
              <p>Signed: {format(new Date(operativeSignedAt), 'dd MMM yyyy, HH:mm')}</p>
            )}
          </div>
        </header>

          <div className="grid grid-cols-2 gap-6 mb-8 text-sm border-b border-slate-200 pb-8">
            <div className="space-y-3">
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase">Patient</span>
                <span className="font-semibold text-slate-800 text-base">
                  {patient.first_name} {patient.last_name}
                </span>
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase">File / Sex / Age</span>
                <span className="text-slate-800">
                  {patient.file_number} &nbsp;|&nbsp; {patient.gender || '—'} &nbsp;|&nbsp;{' '}
                  {patientAge !== null ? `${patientAge} yrs` : '—'}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase">Surgeon</span>
                <span className="font-semibold text-slate-800 text-base">{surgeonName || '—'}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase">Assistants</span>
                <span className="text-slate-800">{assistants.join(', ') || '—'}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8 text-sm">
            <div className="space-y-3">
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase">ANAESTHESIOLOGIST</span>
                <span className="text-slate-800">{anesth || '—'}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase">ASSISTANT(S)</span>
                <span className="text-slate-800">{assistants.join(', ') || '—'}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase">SCRUB NURSE</span>
                <span className="text-slate-800">{scrubNurse || '—'}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase">CIRCULATING NURSE</span>
                <span className="text-slate-800">{circulatingNurse || '—'}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase mb-1">PRE-OPERATIVE DIAGNOSIS</span>
                {stripHtml(header.diagnosisPreOp) ? (
                  <div
                    className="prose prose-sm max-w-none prose-slate text-slate-800"
                    dangerouslySetInnerHTML={{ __html: header.diagnosisPreOp }}
                  />
                ) : (
                  <span className="text-slate-800">—</span>
                )}
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase mb-1">OPERATIVE DIAGNOSIS</span>
                {stripHtml(header.diagnosisPostOp) ? (
                  <div
                    className="prose prose-sm max-w-none prose-slate text-slate-800"
                    dangerouslySetInnerHTML={{ __html: header.diagnosisPostOp }}
                  />
                ) : (
                  <span className="text-slate-800">—</span>
                )}
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase mb-1">OPERATION(S)</span>
                {stripHtml(header.procedurePerformed) ? (
                  <div
                    className="prose prose-sm max-w-none prose-slate text-slate-800"
                    dangerouslySetInnerHTML={{ __html: header.procedurePerformed }}
                  />
                ) : (
                  <span className="text-slate-800">—</span>
                )}
              </div>
            </div>
          </div>



          <div className="mt-8 break-inside-avoid border border-slate-100 rounded-md p-5 print:border-none print:p-0">
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 pb-2 border-b border-slate-200">
              Swab & Instrument Count Correct
            </h4>
            <p className="text-sm">
              {counts.countsCorrectY ? "Yes" : counts.countsCorrectN ? "No" : "—"}
            </p>
            {counts.countsCorrectN && counts.countsExplanation && (
              <div
                className="prose prose-sm max-w-none prose-slate text-slate-800 mt-2"
                dangerouslySetInnerHTML={{ __html: counts.countsExplanation }}
              />
            )}
          </div>

          <div className="mt-12 pt-6 break-inside-avoid">
            <div className="grid grid-cols-2 gap-16">
              <div className="text-center">
                <div className="h-20 border-b border-slate-400 mb-2 flex items-end justify-center">
                  {counts.surgeonSignaturePage1Png && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="Surgeon signature" src={counts.surgeonSignaturePage1Png} className="h-14 object-contain" />
                  )}
                </div>
                <p className="uppercase text-sm text-slate-800 font-bold">{surgeonName || 'Surgeon'}</p>
                <p className="uppercase text-xs text-slate-500">Surgeon Signature</p>
              </div>
              <div className="text-center">
                <div className="h-20 border-b border-slate-400 mb-2 flex items-end justify-center">
                  {counts.scrubNurseSignaturePng && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="Scrub nurse signature" src={counts.scrubNurseSignaturePng} className="h-14 object-contain" />
                  )}
                </div>
                <p className="uppercase text-sm text-slate-800 font-bold">{scrubNurse || 'Scrub Nurse'}</p>
                <p className="uppercase text-xs text-slate-500">Scrub Nurse Signature</p>
              </div>
            </div>
          </div>
        </div>

        {/* Page 2 */}
        <div className="break-before-page mt-16 print:mt-0">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-slate-800 uppercase tracking-widest bg-slate-100 print:bg-slate-100 py-2">
              OPERATION RECORD (CONT.)
            </h3>
          </div>

          <section className="break-inside-avoid p-5 print:p-0">
            {stripHtml(operationRecordHtml) ? (
              <div
                className="prose prose-sm max-w-none prose-slate"
                dangerouslySetInnerHTML={{ __html: operationRecordHtml }}
              />
            ) : (
              <p className="text-slate-500 italic">—</p>
            )}
          </section>



          <div className="mt-10 break-inside-avoid">
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 pb-2 border-b border-slate-200">
              Post-operative Instructions
            </h4>
            {stripHtml(postOpInstructionsHtml) ? (
              <div
                className="prose prose-sm max-w-none prose-slate"
                dangerouslySetInnerHTML={{ __html: postOpInstructionsHtml }}
              />
            ) : (
              <p className="text-slate-500 italic">—</p>
            )}
          </div>

          <div className="mt-14 pt-6 break-inside-avoid">
            <div className="text-center">
              <div className="h-24 border-b border-slate-400 mb-2 flex items-end justify-center">
                {opRec.surgeonOrAnesthesiologistSignaturePng && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt="Surgeon/anaesthesiologist signature"
                    src={opRec.surgeonOrAnesthesiologistSignaturePng}
                    className="h-16 object-contain"
                  />
                )}
              </div>
              <p className="uppercase text-sm text-slate-800 font-bold">
                {(surgeonName || 'Surgeon') + (anesth ? ` / ${anesth}` : '')}
              </p>
              <p className="uppercase text-xs text-slate-500">Surgeon / Anaesthesiologist Signature</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
