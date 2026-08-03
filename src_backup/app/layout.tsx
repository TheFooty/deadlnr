import type { Metadata } from 'next';
import { Space_Grotesk, Plus_Jakarta_Sans, Space_Mono } from 'next/font/google';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-grotesk',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Deadlnr — Swipe your deadlines into submission',
  description: 'Tinder-style swipe app for Canvas LMS assignments. Swipe right to copy context and launch AI.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${spaceGrotesk.variable} ${plusJakarta.variable} ${spaceMono.variable}`}
    >
      <body className="font-sans bg-[#080A0F] text-[#F3F4F6] min-h-screen antialiased bg-radial-gradient bg-grid-pattern selection:bg-[#FF3B00]/30 selection:text-[#FF3B00]">
        {children}
      </body>
    </html>
  );
}
