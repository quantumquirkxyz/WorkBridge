import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Puente Laboral Panamá — Intake de candidato',
  description: 'Captura de CV y experiencias para construir un perfil de candidato validado.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
