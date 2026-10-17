// Compiles apps/web/app/globals.css with the repo's Tailwind v4 PostCSS plugin (no @tailwindcss/cli installed).
// Usage (from repo root): node docs/design/previews/build-css.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';

const here = path.dirname(fileURLToPath(import.meta.url));
const globals = path.resolve(here, '../../../apps/web/app/globals.css');
const src = path.join(here, 'app.src.css');
const header = `@source "../../../apps/web/components";\n@source "../../../apps/web/app";\n@source "./";\n@source not "./app.css";\n@source not "./app.src.css";\n`;
// The page-level stylesheets are plain (unlayered) CSS imported from components; append them after globals.css.
const extra = ['chat', 'explore', 'roles', 'applications', 'auth']
  .map((n) => `\n/* styles/${n}.css */\n` + readFileSync(path.resolve(here, `../../../apps/web/app/styles/${n}.css`), 'utf8'))
  .join('');
const css = readFileSync(globals, 'utf8').replace('@import "tailwindcss";', '@import "tailwindcss";\n' + header) + extra;
writeFileSync(src, css);
const out = await postcss([tailwind({ base: here })]).process(css, { from: src });
writeFileSync(path.join(here, 'app.css'), out.css);
console.log('app.css', out.css.length, 'bytes');
