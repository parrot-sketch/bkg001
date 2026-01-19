import { redirect } from 'next/navigation';

/**
 * Legacy Clerk sign-in route redirect
 * Redirects to custom patient login page using Next.js server-side redirect
 */
export default function SignInPage() {
  redirect('/patient/login');
}
