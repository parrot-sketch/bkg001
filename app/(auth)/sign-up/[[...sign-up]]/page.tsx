import { redirect } from 'next/navigation';

/**
 * Legacy Clerk sign-up route redirect
 * Redirects to custom patient registration page using Next.js server-side redirect
 */
export default function SignUpPage() {
  redirect('/patient/register');
}
