import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import manifest from '../app/manifest';
import { rootViewport } from '../app/viewport-config';

const webRoot = join(import.meta.dirname, '..');
const publicDir = join(webRoot, 'public');

function readPngDimensions(filePath: string): { width: number; height: number } {
  const buf = readFileSync(filePath);
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(buf.subarray(0, 8)).toEqual(pngSignature);
  expect(buf.subarray(12, 16).toString('ascii')).toBe('IHDR');
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

describe('Web App Manifest and Mobile Viewport (#38)', () => {
  it('serves a manifest with Puente Laboral metadata, standalone display, and token colors', () => {
    const data = manifest();

    expect(data.name).toBe('Puente Laboral');
    expect(data.short_name).toBe('Puente');
    expect(data.display).toBe('standalone');
    expect(data.start_url).toBe('/');
    expect(data.theme_color).toBe('#0F766E');
    expect(data.background_color).toBe('#FFF8F0');
    expect(data.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          src: '/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        }),
        expect.objectContaining({
          src: '/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        }),
        expect.objectContaining({
          src: '/icon-maskable-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        }),
      ]),
    );
  });

  it('includes valid 192px, 512px, and maskable PNG icons in apps/web/public/', () => {
    const icon192 = join(publicDir, 'icon-192.png');
    const icon512 = join(publicDir, 'icon-512.png');
    const iconMaskable = join(publicDir, 'icon-maskable-512.png');

    expect(existsSync(icon192)).toBe(true);
    expect(existsSync(icon512)).toBe(true);
    expect(existsSync(iconMaskable)).toBe(true);

    expect(readPngDimensions(icon192)).toEqual({ width: 192, height: 192 });
    expect(readPngDimensions(icon512)).toEqual({ width: 512, height: 512 });
    expect(readPngDimensions(iconMaskable)).toEqual({ width: 512, height: 512 });
  });

  it('exports root layout viewport with light and dark themeColor and interactiveWidget resizes-content', () => {
    expect(rootViewport.interactiveWidget).toBe('resizes-content');
    expect(rootViewport.themeColor).toEqual([
      { media: '(prefers-color-scheme: light)', color: '#0F766E' },
      { media: '(prefers-color-scheme: dark)', color: '#0B1416' },
    ]);

    const layoutSource = readFileSync(join(webRoot, 'app', 'layout.tsx'), 'utf8');
    expect(layoutSource).toContain('export const viewport: Viewport = rootViewport;');
  });

  it('does not register any service worker in the web application', () => {
    expect(existsSync(join(publicDir, 'sw.js'))).toBe(false);
    expect(existsSync(join(publicDir, 'service-worker.js'))).toBe(false);
    const layoutSource = readFileSync(join(webRoot, 'app', 'layout.tsx'), 'utf8');
    expect(layoutSource).not.toMatch(/serviceWorker/i);
  });
});
