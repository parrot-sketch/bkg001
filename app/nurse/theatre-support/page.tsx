import { redirect } from 'next/navigation';

/** @deprecated Use /nurse/intra-op */
export default function TheatreSupportRedirectPage() {
  redirect('/nurse/intra-op');
}
