import type { Viewport } from 'next';

export const THEME_COLORS = {
  light: '#0F766E',
  dark: '#0B1416',
  backgroundLight: '#FFF8F0',
} as const;

export const rootViewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: THEME_COLORS.light },
    { media: '(prefers-color-scheme: dark)', color: THEME_COLORS.dark },
  ],
  interactiveWidget: 'resizes-content',
};
