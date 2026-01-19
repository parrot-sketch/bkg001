import React from "react";

/**
 * Auth Layout
 * 
 * Clean, medical-grade authentication layout for login and registration pages.
 * No sidebar, no dashboard elements - just centered, distraction-free content.
 * Designed for premium aesthetic surgery center: calm, minimal, high trust.
 */
const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
