import type { MetadataRoute } from 'next';
import { THEME_COLORS } from './viewport-config';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Puente Laboral',
    short_name: 'Puente',
    description: 'Captura de CV y experiencias para construir un perfil de candidato validado.',
    start_url: '/',
    display: 'standalone',
    background_color: THEME_COLORS.backgroundLight,
    theme_color: THEME_COLORS.light,
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
