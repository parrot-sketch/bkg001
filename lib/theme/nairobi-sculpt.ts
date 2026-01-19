/**
 * Nairobi Sculpt Brand Theme
 * 
 * Brand colors, typography, and styling constants for the Nairobi Sculpt Clinical Management System.
 * 
 * Inspired by luxury aesthetic with a focus on:
 * - Elegant, refined color palette
 * - Clean typography
 * - Professional spacing
 * - Subtle, premium feel
 */

export const nairobiSculptTheme = {
  colors: {
    // Primary brand colors - Deep, sophisticated tones
    primary: {
      DEFAULT: '#1a1a2e', // Deep navy/charcoal (primary actions)
      light: '#16213e', // Lighter navy
      dark: '#0f1419', // Darker navy
      foreground: '#ffffff', // White text on primary
    },
    
    // Accent colors - Elegant, refined
    accent: {
      DEFAULT: '#d4af37', // Luxury gold (accent/highlights)
      light: '#f4e4bc', // Light gold
      dark: '#b8941f', // Dark gold
      foreground: '#1a1a2e', // Dark text on accent
    },
    
    // Secondary colors - Professional, neutral
    secondary: {
      DEFAULT: '#2c3e50', // Dark slate
      light: '#34495e', // Lighter slate
      dark: '#1e2a35', // Darker slate
      foreground: '#ffffff',
    },
    
    // Success/Health colors
    success: {
      DEFAULT: '#27ae60', // Muted green
      light: '#52c985', // Light green
      dark: '#1e8449', // Dark green
      foreground: '#ffffff',
    },
    
    // Warning colors
    warning: {
      DEFAULT: '#f39c12', // Muted orange
      light: '#f5b041', // Light orange
      dark: '#d68910', // Dark orange
      foreground: '#ffffff',
    },
    
    // Error/Destructive colors
    destructive: {
      DEFAULT: '#e74c3c', // Muted red
      light: '#ec7063', // Light red
      dark: '#c0392b', // Dark red
      foreground: '#ffffff',
    },
    
    // Neutral colors
    background: '#fafafa', // Off-white background
    foreground: '#1a1a2e', // Dark text
    muted: {
      DEFAULT: '#f5f5f5', // Very light gray
      foreground: '#6b7280', // Muted text
    },
    border: '#e5e7eb', // Light border
    card: '#ffffff', // White cards
    cardForeground: '#1a1a2e',
  },
  
  // Typography
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      serif: ['Playfair Display', 'serif'], // Elegant serif for headings
      mono: ['Fira Code', 'monospace'],
    },
    fontSize: {
      xs: '0.75rem', // 12px
      sm: '0.875rem', // 14px
      base: '1rem', // 16px
      lg: '1.125rem', // 18px
      xl: '1.25rem', // 20px
      '2xl': '1.5rem', // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
    },
    fontWeight: {
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
  
  // Spacing scale
  spacing: {
    xs: '0.5rem', // 8px
    sm: '0.75rem', // 12px
    md: '1rem', // 16px
    lg: '1.5rem', // 24px
    xl: '2rem', // 32px
    '2xl': '3rem', // 48px
    '3xl': '4rem', // 64px
  },
  
  // Border radius
  borderRadius: {
    sm: '0.375rem', // 6px
    md: '0.5rem', // 8px
    lg: '0.75rem', // 12px
    xl: '1rem', // 16px
    full: '9999px',
  },
  
  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
};
