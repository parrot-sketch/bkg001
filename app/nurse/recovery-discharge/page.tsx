import { redirect } from 'next/navigation';

/** @deprecated Use /nurse/post-op */
export default function RecoveryDischargeRedirectPage() {
  redirect('/nurse/post-op');
}
