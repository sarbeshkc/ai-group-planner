import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import FirebaseConnectionChecker from '@/components/ui/FirebaseConnectionChecker';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'PlanAI - AI-Powered Group Planning System',
  description: 'Revolutionize how your team plans and coordinates activities with our AI-powered group planning platform.',
  keywords: 'AI, planning, group planning, team coordination, project management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} font-sans`} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <ThemeProvider>
          <AuthProvider>
            <Header />
            <main className="flex-grow">{children}</main>
            <Footer />
            <FirebaseConnectionChecker />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}