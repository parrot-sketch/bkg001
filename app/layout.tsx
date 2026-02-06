import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { Providers } from "./providers";
import "./globals.css";

// Local fonts - no network required at build time
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

// Use Geist as the primary font (already local) with system font fallbacks
// This replaces Inter - Geist is a modern, clean sans-serif similar to Inter
const inter = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-inter",
  weight: "100 900",
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
});

// For display/heading font, use Geist with serif fallback
// In production, you can add a local serif font file if needed
const playfair = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-playfair",
  weight: "100 900",
  fallback: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
});

export const metadata: Metadata = {
  title: "Nairobi Sculpt - Aesthetic Surgery Management",
  description: "Premier Aesthetic Surgery & Clinical Management System",
  icons: {
    icon: [
      { url: "/icon.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
  openGraph: {
    title: "Nairobi Sculpt - Aesthetic Surgery Management",
    description: "Premier Aesthetic Surgery & Clinical Management System",
    images: ["https://res.cloudinary.com/dcngzaxlv/image/upload/v1768807323/logo_tw2voz.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${playfair.variable} antialiased`}
      >
        <Providers>
          {children}
          <Toaster richColors position="top-center" />
        </Providers>
      </body>
    </html>
  );
}
