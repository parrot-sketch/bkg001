import { AuthShell } from '@/components/auth/AuthShell';
import { AuthBrandPanel } from '@/components/auth/AuthBrandPanel';

export const metadata = {
  title: 'Sign In — Nairobi Sculpt',
  description: 'Secure access to your clinical workspace.',
};

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthShell
      brandPanel={<AuthBrandPanel />}
      authPanel={
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12 sm:px-10 lg:px-14 xl:px-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-[#E8DCC6]/25 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-[#B0D4E8]/20 blur-3xl"
          />
          <div className="relative z-10 w-full max-w-[420px]">
            {children}
          </div>
        </div>
      }
    />
  );
};

export default AuthLayout;