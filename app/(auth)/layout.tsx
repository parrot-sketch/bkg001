import { AuthShell } from '@/components/auth/AuthShell';
import { AuthBrandPanel } from '@/components/auth/AuthBrandPanel';
import { SecureWorkspaceBadge } from '@/components/auth/SecureWorkspaceBadge';

export const metadata = {
  title: 'Sign In — Nairobi Sculpt',
  description: 'Secure staff access to the Nairobi Sculpt clinical information system.',
};

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthShell>
      <AuthBrandPanel />

      <div className="relative z-10 mt-10 w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both">
        <div className="rounded-sm border border-white/15 bg-[#FBF9F5] px-6 py-8 shadow-[0_24px_64px_rgba(0,0,0,0.35)] sm:px-8 sm:py-9">
          {children}
        </div>
      </div>

      <SecureWorkspaceBadge />
    </AuthShell>
  );
};

export default AuthLayout;
