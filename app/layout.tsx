import type { Metadata } from "next";
import localFont from "next/font/local";
import { Inter, Playfair_Display } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

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

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "Nairobi Sculpt - Aesthetic Surgery Management",
  description: "Premier Aesthetic Surgery & Clinical Management System",
  icons: {
    icon: "https://res.cloudinary.com/dcngzaxlv/image/upload/v1768807323/logo_tw2voz.png",
    apple: "https://res.cloudinary.com/dcngzaxlv/image/upload/v1768807323/logo_tw2voz.png",
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
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${playfairDisplay.variable} antialiased`}
      >
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
