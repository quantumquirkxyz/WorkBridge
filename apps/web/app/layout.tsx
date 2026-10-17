import type { Metadata, Viewport } from 'next';
import { Archivo_Black, Space_Grotesk } from 'next/font/google';
import { CandidateShell } from '../components/CandidateShell';
import { QueryProvider } from '../components/query-provider';
import { ThemeProvider } from '../components/theme-provider';
import { Toaster } from '../components/ui/sonner';
import { rootViewport } from './viewport-config';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const archivoBlack = Archivo_Black({
  variable: '--font-archivo-black',
  subsets: ['latin', 'latin-ext'],
  weight: '400',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'WorkBridge — Tu experiencia cuenta', template: '%s · WorkBridge' },
  description: 'Cuéntanos qué sabes hacer y te mostramos vacantes en Panamá, qué te falta y cómo llegar, con tu orientador/a al lado.',
};

export const viewport: Viewport = rootViewport;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${spaceGrotesk.variable} ${archivoBlack.variable}`}>
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
