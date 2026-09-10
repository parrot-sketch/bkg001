import { redirect } from 'next/navigation';

/** Patients browse is frontdesk-owned; nurse journey starts from Cases. */
export default function NursePatientsRedirectPage() {
  redirect('/nurse/surgical-cases');
}
