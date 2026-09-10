import { redirect } from 'next/navigation';

/** Legacy appointment notes — not part of surgical case journey. */
export default function PrePostOpRedirectPage() {
  redirect('/nurse/dashboard');
}
