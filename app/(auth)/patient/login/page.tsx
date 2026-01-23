import { redirect } from 'next/navigation';

/**
 * Legacy patient login route redirect
 * Redirects to unified login page for backwards compatibility
 */
export default function PatientLoginPage() {
  redirect('/login');
}
