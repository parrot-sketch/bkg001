import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ caseId: string }>;
}

/** Immediate Recovery Care duplicates Post-Op PACU — route to the canonical record. */
export default async function ImmediateRecoveryRedirectPage({ params }: Props) {
  const { caseId } = await params;
  redirect(`/nurse/recovery-cases/${caseId}/record`);
}
