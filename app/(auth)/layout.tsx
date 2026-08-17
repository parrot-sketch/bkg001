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
        <div className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-10 lg:px-14 xl:px-20">
          <div className="w-full max-w-[400px]">
            {children}
          </div>
        </div>
      }
    />
  );
};

export default AuthLayout;