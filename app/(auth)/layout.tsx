import React, { Suspense } from 'react';

export const metadata = {
  title: 'Sign In — Nairobi Sculpt',
  description: 'Secure access to your clinical workspace.',
};

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/bg.webp')" }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#2c2e4b]/85 via-[#2c2e4b]/70 to-[#1c1d33]/90"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 45%, rgba(202,162,106,0.12) 0%, rgba(44,46,75,0) 70%)',
        }}
        aria-hidden="true"
      />
      <main
        id="main-content"
        className="relative flex items-center justify-center min-h-screen p-6 sm:p-8"
        aria-label="Authentication"
      >
        <Suspense fallback={null}>
          {children}
        </Suspense>
      </main>
    </div>
  );
};

export default AuthLayout;