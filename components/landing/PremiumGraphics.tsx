'use client';

/**
 * Premium Graphics Components for Landing Page
 * Medical/aesthetic themed SVG illustrations and animated elements
 */

import { useEffect, useRef } from 'react';

// Floating particles background
export function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(25)].map((_, i) => {
        const size = 3 + Math.random() * 6;
        const delay = Math.random() * 4;
        const duration = 4 + Math.random() * 3;
        return (
          <div
            key={i}
            className="absolute rounded-full opacity-20 animate-float-particles"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${size}px`,
              height: `${size}px`,
              backgroundColor: `hsl(${196 + Math.random() * 40}, 70%, ${60 + Math.random() * 20}%)`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
          />
        );
      })}
    </div>
  );
}

// Medical cross icon (elegant)
export function MedicalCrossIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2L12 22M2 12L22 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="text-brand-primary"
      />
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" className="text-brand-primary/30" />
    </svg>
  );
}

// Aesthetic beauty icon
export function BeautyIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2C8 2 5 5 5 9C5 13 8 16 12 16C16 16 19 13 19 9C19 5 16 2 12 2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        className="text-brand-primary"
      />
      <circle cx="9" cy="9" r="1" fill="currentColor" className="text-brand-primary" />
      <circle cx="15" cy="9" r="1" fill="currentColor" className="text-brand-primary" />
      <path
        d="M9 13C9 13 10 15 12 15C14 15 15 13 15 13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        className="text-brand-primary"
      />
    </svg>
  );
}

// Premium wave pattern
export function WavePattern({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute inset-0 ${className}`}>
      <svg className="w-full h-full" viewBox="0 0 1200 120" preserveAspectRatio="none">
        <path
          d="M0,60 Q300,80 600,60 T1200,60 L1200,120 L0,120 Z"
          fill="currentColor"
          className="text-brand-powder/10"
        />
        <path
          d="M0,80 Q300,100 600,80 T1200,80 L1200,120 L0,120 Z"
          fill="currentColor"
          className="text-brand-isabelline/20"
        />
      </svg>
    </div>
  );
}

// Animated gradient orb
export function GradientOrb({ 
  size = 400, 
  color = "primary",
  className = "",
  delay = 0 
}: { 
  size?: number; 
  color?: "primary" | "powder" | "secondary" | "isabelline";
  className?: string;
  delay?: number;
}) {
  const colorClasses = {
    primary: "bg-brand-primary",
    powder: "bg-brand-powder",
    secondary: "bg-brand-secondary",
    isabelline: "bg-brand-isabelline",
  };

  return (
    <div
      className={`absolute rounded-full blur-3xl opacity-30 animate-pulse ${colorClasses[color]} ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        animationDelay: `${delay}s`,
      }}
    />
  );
}

// Service icon with premium styling
export function ServiceIcon({ 
  icon: Icon, 
  className = "" 
}: { 
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/10 to-brand-powder/20 rounded-2xl blur-xl" />
      <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-brand-primary/10">
        <Icon className="w-8 h-8 text-brand-primary" />
      </div>
    </div>
  );
}

// Premium decorative element
export function DecorativeElement({ 
  type = "circle",
  className = "" 
}: { 
  type?: "circle" | "square" | "diamond";
  className?: string;
}) {
  const shapes = {
    circle: "rounded-full",
    square: "rounded-lg rotate-45",
    diamond: "rotate-45",
  };

  return (
    <div
      className={`absolute ${shapes[type]} bg-gradient-to-br from-brand-primary/20 to-brand-powder/30 blur-2xl ${className}`}
      style={{
        width: "200px",
        height: "200px",
      }}
    />
  );
}

// Animated mesh gradient
export function AnimatedMeshGradient({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute inset-0 ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 via-brand-powder/10 to-brand-isabelline/5 animate-pulse" />
      <div className="absolute inset-0 bg-gradient-to-tl from-brand-secondary/5 via-transparent to-brand-powder/10" 
           style={{ animationDelay: '1s' }} />
    </div>
  );
}

// Premium card glow effect
export function CardGlow({ className = "" }: { className?: string }) {
  return (
    <>
      <div className={`absolute -inset-0.5 bg-gradient-to-r from-brand-primary/20 via-brand-powder/10 to-brand-primary/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${className}`} />
      <div className={`absolute -inset-1 bg-gradient-to-br from-brand-primary/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 ${className}`} />
    </>
  );
}
