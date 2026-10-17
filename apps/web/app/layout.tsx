import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { CandidateShell } from '../components/CandidateShell';
import { QueryProvider } from '../components/query-provider';
import { ThemeProvider } from '../components/theme-provider';
import { Toaster } from '../components/ui/sonner';
import { rootViewport } from './viewport-config';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-plus-jakarta',
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Puente Laboral Panamá — Intake de candidato',
  description: 'Captura de CV y experiencias para construir un perfil de candidato validado.',
};

export const viewport: Viewport = rootViewport;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={plusJakartaSans.variable}>
        <QueryProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <CandidateShell>{children}</CandidateShell>
            <Toaster />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
