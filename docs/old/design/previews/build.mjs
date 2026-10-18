// Generates the static preview HTML pages. Hand-translation of the JSX in apps/web (same class names).
// Usage (from repo root): node docs/old/design/previews/build.mjs && node docs/old/design/previews/build-css.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));

/* ------------------------------------------------------------------ icons (lucide paths) */
const ICONS = {
  map: '<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/>',
  briefcase: '<path d="M12 12h.01"/><path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M22 13a18.15 18.15 0 0 1-20 0"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
  route: '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  user: '<path d="M18 20a6 6 0 0 0-12 0"/><circle cx="12" cy="10" r="4"/><circle cx="12" cy="12" r="10"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  msg: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  ok: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  no: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  arrowLeft: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>',
  square: '<rect width="18" height="18" x="3" y="3" rx="2"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  hourglass: '<path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>',
  userCheck: '<path d="m16 11 2 2 4-4"/><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
  dot: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1"/>',
};
const icon = (n, cls = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${cls ? ` class="${cls}"` : ''}>${ICONS[n]}</svg>`;

/* ------------------------------------------------------------------ ui primitives (class strings copied from components/ui) */
const BTN_BASE = 'inline-flex shrink-0 appearance-none items-center justify-center gap-2 whitespace-nowrap rounded-md border-[3px] border-ink font-display text-sm uppercase tracking-wide shadow-[5px_5px_0_var(--shadow-color)] transition-[transform,box-shadow] duration-100 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_var(--shadow-color)] active:translate-x-[5px] active:translate-y-[5px] active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0';
const BTN_VARIANT = {
  primary: 'bg-primary text-primary-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
  ghost: 'border-transparent bg-transparent text-foreground shadow-none hover:translate-x-0 hover:translate-y-0 hover:border-ink hover:bg-muted hover:shadow-none',
  outline: 'bg-card text-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
  link: 'h-auto rounded-none border-0 bg-transparent p-0 font-sans font-bold normal-case tracking-normal text-primary shadow-none underline underline-offset-4 hover:translate-x-0 hover:translate-y-0 hover:shadow-none',
};
const BTN_SIZE = { sm: 'min-h-9 px-3', md: 'min-h-11 px-4', lg: 'min-h-[52px] px-6' };
const btnCls = (variant = 'primary', size = 'md', extra = '') => `${BTN_BASE} ${BTN_VARIANT[variant]} ${BTN_SIZE[size]} ${extra}`.trim();
const button = (label, { variant = 'primary', size = 'md', extra = '', disabled = false, type = 'button' } = {}) =>
  `<button type="${type}" class="${btnCls(variant, size, extra)}"${disabled ? ' disabled' : ''}>${label}</button>`;
const buttonLink = (label, href, o = {}) => `<a href="${href}" class="${btnCls(o.variant, o.size, o.extra)}">${label}</a>`;

const BADGE = {
  neutral: 'bg-muted text-foreground',
  success: 'bg-mint text-ink',
  warning: 'bg-yellow text-ink',
  danger: 'bg-danger text-white dark:text-ink',
  accent: 'bg-pink text-ink',
};
const badge = (label, tone = 'neutral', extra = '') =>
  `<div class="inline-flex items-center rounded-sm border-2 border-ink px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${BADGE[tone]} ${extra}">${label}</div>`;

const CARD = 'rounded-lg border-[3px] border-ink bg-card text-card-foreground shadow-[5px_5px_0_var(--shadow-color)]';
const card = (inner, extra = '', attrs = '') => `<div class="${CARD} ${extra}"${attrs ? ' ' + attrs : ''}>${inner}</div>`;
const cardHeader = (inner, extra = '') => `<div class="flex flex-col space-y-1.5 p-5 ${extra}">${inner}</div>`;
const cardTitle = (inner, extra = '') => `<h3 class="font-display text-lg uppercase leading-6 ${extra}">${inner}</h3>`;
const cardContent = (inner, extra = '') => `<div class="p-5 pt-0 ${extra}">${inner}</div>`;

const INPUT = 'flex min-h-11 w-full rounded-md border-[2.5px] border-ink bg-card px-3 py-2 text-base text-foreground shadow-[3px_3px_0_var(--shadow-color)] outline-none transition-shadow placeholder:text-muted-foreground focus-visible:shadow-[5px_5px_0_var(--primary)] disabled:cursor-not-allowed disabled:opacity-50';
const input = (id, { type = 'text', value = '', placeholder = '', extra = '', disabled = false } = {}) =>
  `<input id="${id}" type="${type}" class="${INPUT} ${extra}" value="${value}" placeholder="${placeholder}"${disabled ? ' disabled' : ''}>`;
const textarea = (id, { value = '', placeholder = '', rows = 2, extra = '' } = {}) =>
  `<textarea id="${id}" rows="${rows}" placeholder="${placeholder}" class="flex min-h-36 w-full rounded-md border-[2.5px] border-ink bg-card px-3 py-2 text-base text-foreground shadow-[3px_3px_0_var(--shadow-color)] outline-none transition-shadow placeholder:text-muted-foreground focus-visible:shadow-[5px_5px_0_var(--primary)] disabled:cursor-not-allowed disabled:opacity-50 ${extra}">${value}</textarea>`;
const LABEL = 'text-sm font-semibold leading-5';
const label = (forId, text) => `<label for="${forId}" class="${LABEL}">${text}</label>`;
const selectTrigger = (id, value) =>
  `<button type="button" role="combobox" aria-expanded="false" id="${id}" class="flex min-h-11 w-full items-center justify-between rounded-md border-[2.5px] border-ink bg-card px-3 py-2 text-base text-foreground shadow-[3px_3px_0_var(--shadow-color)] outline-none focus:shadow-[5px_5px_0_var(--primary)] [&>span]:line-clamp-1"><span>${value}</span>${icon('down', 'size-4 opacity-60')}</button>`;
const checkbox = (checked) =>
  `<button type="button" role="checkbox" aria-checked="${checked}" data-state="${checked ? 'checked' : 'unchecked'}" class="peer size-5 shrink-0 rounded-sm border-2 border-ink bg-card shadow-[2px_2px_0_var(--shadow-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground">${checked ? `<span data-state="checked" class="flex items-center justify-center">${icon('check', 'size-3.5')}</span>` : ''}</button>`;
const checkLabel = (checked, text) => `<label class="${LABEL}">${checkbox(checked)}${text}</label>`;
const progress = (value, extra = '') =>
  `<div role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}" aria-label="Preparación ${value}%" class="relative h-4 w-full overflow-hidden rounded-sm border-2 border-ink bg-card ${extra}"><div class="h-full w-full flex-1 border-r-2 border-ink bg-pink transition-all duration-700 ease-out" style="transform: translateX(-${100 - value}%)"></div></div>`;
const skeleton = (extra) => `<div class="animate-pulse rounded-md border-2 border-ink/30 bg-muted ${extra}"></div>`;
const tabs = (items, active, content) =>
  `<div dir="ltr" data-orientation="horizontal"><div role="tablist" aria-orientation="horizontal" class="inline-flex min-h-11 items-center justify-center gap-1 rounded-md border-[3px] border-ink bg-card p-1 text-muted-foreground">${items.map((t, i) => `<button type="button" role="tab" data-state="${i === active ? 'active' : 'inactive'}" aria-selected="${i === active}" class="inline-flex min-h-9 items-center justify-center rounded-sm border-2 border-transparent px-3 py-1.5 text-sm font-bold data-[state=active]:border-ink data-[state=active]:bg-yellow data-[state=active]:text-ink data-[state=active]:shadow-[2px_2px_0_var(--shadow-color)]">${t}</button>`).join('')}</div><div role="tabpanel" data-state="active" class="mt-2">${content}</div></div>`;
const signOut = () => button('Cerrar sesión', { variant: 'outline' });


/* ------------------------------------------------------------------ shells */
const NAV = [
  { href: 'vacantes.html', key: 'vacantes', label: 'Vacantes', icon: 'briefcase' },
  { href: 'ruta.html', key: 'ruta', label: 'Mi ruta', icon: 'route' },
  { href: 'postulaciones.html', key: 'post', label: 'Postulaciones', icon: 'file' },
  { href: 'perfil.html', key: 'perfil', label: 'Mi perfil', icon: 'user' },
];
const navLink = (n, active, badgeCount) =>
  `<a href="${n.href}" class="candidate-nav-link${active ? ' is-active' : ''}"${active ? ' aria-current="page"' : ''}>${icon(n.icon)}<span>${n.label}${badgeCount > 0 ? `<span class="nav-badge" aria-label="${badgeCount} vacantes nuevas">${badgeCount}</span>` : ''}</span></a>`;
const themeToggle = () => `<button type="button" class="theme-toggle" aria-label="Cambiar a modo oscuro" aria-pressed="false">${icon('moon')}</button>`;
function candidateShell(active, inner, badgeCount = 0) {
  const li = () => NAV.map((n) => `<li>${navLink(n, n.key === active, n.key === 'vacantes' ? badgeCount : 0)}</li>`).join('');
  return `<div class="candidate-shell">
<header class="candidate-header">
  <a class="candidate-brand" href="vacantes.html" aria-label="WorkBridge, ir a Vacantes"><span class="candidate-brand-mark" aria-hidden="true">${icon('map')}</span><span>WorkBridge</span></a>
  <nav aria-label="Navegación principal"><ul class="candidate-nav candidate-nav-desktop">${li()}</ul></nav>
  <div class="header-tools">${themeToggle()}</div>
</header>
<div class="candidate-content">${inner}</div>
<nav class="candidate-bottom-nav" aria-label="Navegación móvil"><ul class="candidate-nav">${li()}</ul></nav>
</div>`;
}
/* PublicHeader: welcome, chat and the account screens. */
const publicHeader = ({ signedIn = false, current = '' } = {}) => `<header class="candidate-header public-header">
  <a class="candidate-brand" href="welcome.html" aria-label="WorkBridge, ir al inicio"><span class="candidate-brand-mark" aria-hidden="true">${icon('map')}</span><span>WorkBridge</span></a>
  <nav class="public-header-actions" aria-label="Cuenta">${signedIn
    ? `${buttonLink('Mi panel', 'vacantes.html', { variant: 'outline', size: 'sm' })}${button('Cerrar sesión', { variant: 'outline' })}`
    : `<a class="auth-nav-link" href="ingresar.html"${current === 'ingresar' ? ' aria-current="page"' : ''}>Ingresar</a><a class="auth-nav-link auth-nav-link-signup" href="registrarse.html"${current === 'registrarse' ? ' aria-current="page"' : ''}>Registrarse</a>`}${themeToggle()}</nav>
</header>`;
/* RoleHeader: /orientador and /empresa. */
const roleHeader = (role) => `<header class="role-header"><div class="role-header-start"><a class="candidate-brand" href="${role === 'employer' ? 'empresa' : 'orientador'}.html" aria-label="WorkBridge, ir a ${role === 'employer' ? 'Postulaciones' : 'Pendientes'}"><span class="candidate-brand-mark" aria-hidden="true">${icon('map')}</span><span>WorkBridge</span></a><span class="role-badge role-badge-${role}">${role === 'employer' ? 'Empresa' : 'Orientador/a'}</span></div><div class="header-tools">${themeToggle()}${button('Cerrar sesión', { variant: 'outline', size: 'sm' })}</div></header>`;

/* ------------------------------------------------------------------ page registry (grouped by journey) */
const GROUPS = [
  ['chat', 'J1/J6 · Inicio y chat'],
  ['vac', 'J2-J5 · Vacantes, ruta, perfil'],
  ['post', 'J7 · Postulaciones'],
  ['ori', 'J8 · Orientador'],
  ['emp', 'J9 · Empresa'],
  ['acc', 'J10 · Acceso y cuenta'],
  ['sys', 'Sistema'],
  ['cmp', 'Componentes'],
];
const PAGES = [
  ['welcome', 'Bienvenida', '/', 'chat'],
  ['chat-inicio', 'Chat: inicio', '/chat', 'chat'],
  ['chat-conversacion', 'Chat: conversación', '/chat', 'chat'],
  ['chat-grabando', 'Chat: grabando voz', '/chat', 'chat'],
  ['chat-resultado', 'Chat: CV leído (skills)', '/chat', 'chat'],
  ['vacantes', 'Vacantes', '/vacantes', 'vac'],
  ['vacantes-detalle', 'Vacantes: detalle', '/vacantes?v=…', 'vac'],
  ['vacantes-guardar', 'Vacantes: guardar búsqueda', '/vacantes', 'vac'],
  ['vacantes-vacio', 'Vacantes: sin coincidencias', '/vacantes', 'vac'],
  ['ruta', 'Mi ruta', '/ruta', 'vac'],
  ['ruta-vacia', 'Mi ruta: vacía', '/ruta', 'vac'],
  ['perfil', 'Mi perfil', '/perfil', 'vac'],
  ['perfil-eliminar', 'Perfil: eliminar datos', '/perfil', 'vac'],
  ['postulaciones', 'Postulaciones: lista', '/postulaciones', 'post'],
  ['postulaciones-borrador', 'Postulación: borrador', '/postulaciones/[id]', 'post'],
  ['postulaciones-revision', 'Postulación: en revisión', '/postulaciones/[id]', 'post'],
  ['postulaciones-lista', 'Postulación: lista + confirmar', '/postulaciones/[id]', 'post'],
  ['postulaciones-final', 'Postulación: estados finales', '/postulaciones/[id]', 'post'],
  ['postulaciones-vacia', 'Postulaciones: vacía y error', '/postulaciones', 'post'],
  ['postulaciones-nueva', 'Postulación: preparando', '/postulaciones/nueva', 'post'],
  ['orientador', 'Orientador: cola', '/orientador', 'ori'],
  ['orientador-detalle', 'Orientador: revisión', '/orientador/[id]', 'ori'],
  ['orientador-decidida', 'Orientador: decisión tomada', '/orientador/[id]', 'ori'],
  ['orientador-error', 'Orientador: errores 401/409/5xx', '/orientador/[id]', 'ori'],
  ['orientador-prohibido', 'Orientador: 403', '/orientador/[id]', 'ori'],
  ['empresa', 'Empresa: cola', '/empresa', 'emp'],
  ['empresa-detalle', 'Empresa: detalle', '/empresa/[id]', 'emp'],
  ['empresa-decidida', 'Empresa: decidida', '/empresa/[id]', 'emp'],
  ['empresa-error', 'Empresa: errores', '/empresa/[id]', 'emp'],
  ['ingresar', 'Ingresar', '/ingresar', 'acc'],
  ['ingresar-enlace-enviado', 'Ingresar: enlace enviado', '/ingresar', 'acc'],
  ['registrarse', 'Registrarse', '/registrarse', 'acc'],
  ['cuenta', 'Mi cuenta', '/cuenta', 'acc'],
  ['cuenta-anonima', 'Cuenta: invitado', '/cuenta', 'acc'],
  ['sin-acceso', 'Sin acceso', '/cuenta/sin-acceso', 'sys'],
  ['404', '404', 'app/not-found.tsx', 'sys'],
  ['error', 'Error', 'app/error.tsx', 'sys'],
  ['componentes', 'Componentes', 'components/ui', 'cmp'],
];

function page(slug, title, body, note = '') {
  const portals = [];
  body = body.replace(/<!--M-->([\s\S]*?)<!--\/M-->/g, (_, m) => { portals.push(m); return ''; }) + portals.join('');
  const grp = (PAGES.find(([s]) => s === slug) || [])[3];
  const menus = GROUPS.map(([g, gl]) => `<details class="pv-menu"${g === grp ? ' data-current' : ''}><summary>${gl}</summary><div class="pv-menu-list">${PAGES.filter((p) => p[3] === g).map(([s, t]) => `<a href="${s}.html"${s === slug ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</div></details>`).join('');
  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · WorkBridge preview</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Space+Grotesk:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="app.css">
<link rel="stylesheet" href="preview.css">
<script src="preview.js"></script>
</head>
<body>
<div class="pv-bar"><strong>WorkBridge preview</strong><a href="index.html"${slug === 'index' ? ' aria-current="page"' : ''}>Galería</a>${menus}<span class="pv-sp"></span><button id="pv-mobile" type="button">Vista móvil (390px)</button><button id="pv-dark" type="button">Modo oscuro</button></div>
${note ? `<p class="pv-note">${note}</p>` : ''}
<div class="pv-device"></div>
<div id="pv-root">
${body}
</div>
</body>
</html>
`;
  writeFileSync(path.join(here, `${slug}.html`), html);
}

/* modal helpers (Radix portals rendered statically: overlay + centred dialog, below the preview bar) */
const DIALOG = 'grid w-full max-w-lg gap-4 rounded-lg border-[3px] border-ink bg-card p-6 shadow-[8px_8px_0_var(--shadow-color)]';
const modal = (inner, labelId) => `<!--M--><div class="fixed inset-0 z-50 bg-black/50 pv-below" data-state="open"></div><div class="fixed inset-0 z-50 flex items-center justify-center p-4 pv-below"><div role="dialog" aria-modal="true" aria-labelledby="${labelId}" data-state="open" class="${DIALOG}">${inner}</div></div><!--/M-->`;
const dlgClose = () => `<button type="button" class="absolute right-4 top-4 rounded-md opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">${icon('x', 'size-4')}<span class="sr-only">Cerrar</span></button>`;
const modalDialog = (inner, labelId) => `<!--M--><div class="fixed inset-0 z-50 bg-black/50 pv-below" data-state="open"></div><div class="fixed inset-0 z-50 flex items-center justify-center p-4 pv-below"><div role="dialog" aria-modal="true" aria-labelledby="${labelId}" data-state="open" class="relative ${DIALOG}">${inner}${dlgClose()}</div></div><!--/M-->`;

/* ------------------------------------------------------------------ shared sample data (exploration cards) */
const xpChip = (t, tone = '') => `<span class="xp-chip${tone ? ' xp-chip-' + tone : ''}">${t}</span>`;
const xpReady = (score) => `<div class="xp-ready"><div class="xp-ready-label"><span>Preparación</span><span>${score}%</span></div><div class="xp-ready-track" role="progressbar" aria-label="Preparación" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${score}" aria-valuetext="${score}%"><span class="xp-ready-fill" data-tone="${score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low'}" style="width:${score}%"></span></div></div>`;
const VACANCIES = [
  { title: 'Cajero/a', company: 'Farmacia La Salud', mod: 'Presencial', fresh: 'Hace 1 día', loc: 'San Miguelito', sal: 'USD 600 – 640', score: 91, miss: [] },
  { title: 'Auxiliar de ventas', company: 'Supermercados Del Istmo', mod: 'Presencial', fresh: 'Hace 3 horas', loc: 'Bella Vista, Ciudad de Panamá', sal: 'USD 620 – 700', score: 82, miss: ['Excel básico', 'Disponibilidad los sábados'] },
  { title: 'Atención al cliente', company: 'Conecta Panamá', mod: 'Híbrido', fresh: 'Hace 2 días', loc: 'Obarrio, Ciudad de Panamá', sal: 'USD 700 – 780', score: 74, miss: ['Inglés conversacional'] },
  { title: 'Promotor/a de ventas', company: 'Digital Plaza', mod: 'Presencial', fresh: 'Hace 6 días', loc: 'Albrook, Ciudad de Panamá', sal: 'Salario no publicado', score: 66, miss: ['Manejo de punto de venta', 'Experiencia mínima de 6 meses'] },
  { title: 'Asistente administrativo', company: 'Logística Alameda', mod: 'Presencial', fresh: 'Hace 3 días', loc: 'Juan Díaz', sal: 'Desde USD 650', score: 58, miss: ['Excel intermedio'] },
  { title: 'Soporte técnico junior', company: 'Pixel Taller', mod: 'Desde casa', fresh: 'Hace 5 días', loc: 'Remoto (Panamá)', sal: 'USD 750 – 900', score: 46, miss: ['Redes básicas', 'Inglés técnico'] },
];
const vacancyCard = (v, { isNew = false, loading = false } = {}) =>
  `<button type="button" class="xp-card" aria-label="Ver detalles de ${v.title}"><span class="xp-card-top"><span class="xp-card-chips">${xpChip(v.mod)}${isNew ? xpChip('Nueva', 'mint') : ''}</span><span>${v.fresh}</span></span><strong class="xp-card-title">${v.title}</strong><span class="xp-card-company">${v.company}</span><span class="xp-card-meta">${v.loc} · ${v.sal}</span>${loading ? skeleton('xp-ready-skeleton') : xpReady(v.score)}${v.miss.length ? `<span class="xp-card-missing"><span class="xp-missing-label">Te falta:</span>${v.miss.slice(0, 2).map((m) => `<span class="xp-card-missing-item">${m}</span>`).join('')}</span>` : ''}<span class="xp-card-cta"><span>Ver detalles →</span></span></button>`;
const grid = (items) => `<ul class="xp-grid">${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
const pageHead = (eyebrow, h1, lead, { tone = '', extra = '', row = false } = {}) =>
  `<header class="page-head${tone ? ' ' + tone : ''}${row ? ' page-head-row' : ''}">${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}<h1>${h1}</h1>${lead ? `<p class="lead">${lead}</p>` : ''}${extra}</header>`;

/* ------------------------------------------------------------------ 1. welcome */
{
  const stickers = [
    ['Atención al cliente', 'var(--yellow)', '-6deg', '0s', '2%', '4%'],
    ['Excel', 'var(--mint)', '4deg', '.4s', '48%', '16%'],
    ['Ventas', 'var(--pink)', '-3deg', '.8s', '8%', '34%'],
    ['Voluntariado', '#8fb4ff', '5deg', '1.1s', '42%', '50%'],
    ['Negocio familiar', '#ffffff', '-4deg', '1.5s', '4%', '66%'],
    ['Inglés B1', 'var(--yellow)', '3deg', '1.9s', '52%', '82%'],
  ].map(([l, c, r, d, left, top]) => `<span class="sticker" style="--c:${c};--r:${r};--d:${d};left:${left};top:${top}">${l}</span>`).join('');
  const marq = ['Sin experiencia', 'Con experiencia que no sabías', 'Prácticas', 'Primer empleo', 'Medio tiempo', 'Tu ruta'];
  const marqHtml = [...marq, ...marq, ...marq, ...marq].map((i) => `<span>${i} ✦ </span>`).join('');
  const steps = [
    ['msg', 'Cuéntanos con tus palabras', 'Escribes lo que sabes hacer, aunque lo hayas aprendido por tu cuenta. No necesitas un CV.'],
    ['briefcase', 'Mira vacantes para ti', 'Te mostramos oportunidades y qué te falta para cada una.'],
    ['route', 'Sigue una ruta', 'Si todavía no hay una vacante, te proponemos cursos para acercarte.'],
  ].map(([ic, t, b], i) => `<li class="welcome-step"><span class="welcome-step-mark" aria-hidden="true">${icon(ic)}<span>${i + 1}</span></span><h3>${t}</h3><p>${b}</p></li>`).join('');
  page('welcome', 'Bienvenida', `${publicHeader()}<main class="welcome-page">
<div class="welcome-hero">
  <div class="welcome-intro">
    <p class="eyebrow">WorkBridge</p>
    <h1>Tu experiencia <mark>cuenta.</mark> Aunque sea informal.</h1>
    <p class="welcome-copy">Cuéntanos qué sabes hacer y te mostramos vacantes y cursos para ti.</p>
    ${buttonLink(`Empezar ${icon('arrow')}`, 'chat-inicio.html', { size: 'lg', extra: 'welcome-action' })}
    <ul class="welcome-trust">${['Gratis', '5 minutos', 'Tú decides qué compartir'].map((t) => `<li>${icon('check')} ${t}</li>`).join('')}</ul>
  </div>
  <div class="welcome-illustration" aria-hidden="true">${stickers}</div>
</div>
<div class="marquee" aria-hidden="true"><div class="marquee-track">${marqHtml}</div></div>
<section class="welcome-steps" aria-labelledby="welcome-how"><h2 id="welcome-how">Qué puedes hacer aquí</h2><ol>${steps}</ol></section>
<p class="welcome-note">Nunca enviamos una postulación sin tu permiso.</p>
</main>`, 'Ruta real: / (components/WelcomeScreen.tsx). Sin cambios visuales; ahora con PublicHeader (Ingresar / Registrarse / modo oscuro) y startHref configurable. Título del documento: «WorkBridge — Tu experiencia cuenta».');
}

/* ------------------------------------------------------------------ 2. chat */
const attachChip = (name, size, { kind = 'pdf', remove = false } = {}) =>
  `<div class="flex items-center gap-3 rounded-md border-[3px] px-3 py-2 text-sm font-semibold shadow-[3px_3px_0_var(--shadow-color)] border-ink bg-card text-foreground" role="listitem" aria-label="Archivo adjunto: ${name}">${badge(kind === 'pdf' ? 'PDF' : 'Imagen', kind === 'pdf' ? 'neutral' : 'accent', 'shrink-0')}<div class="flex-1 min-w-0 truncate" title="${name}">${name}</div><span class="shrink-0 text-muted-foreground">${size}</span>${remove ? button('×', { variant: 'destructive', size: 'sm', extra: 'min-h-11 min-w-11 px-0' }) : ''}</div>`;
const bubble = (role, text, { chips = [], skills = [], attach = '' } = {}) =>
  `<div class="chat-turn"><article class="chat-bubble chat-bubble-${role}"><p>${text}</p>${skills.length ? `<div class="chat-skill-chips" aria-label="Habilidades encontradas">${skills.map((s) => `<span class="chat-skill-chip">${s}</span>`).join('')}</div>` : ''}${chips.length ? `<div class="chat-chips">${chips.map((c) => `<button type="button" class="chat-chip">${c}</button>`).join('')}</div>` : ''}</article>${attach}</div>`;
const chatHeader = (phase, filled) => {
  const st = { profile: ['current', 'upcoming', 'upcoming'], preferences: ['complete', 'current', 'upcoming'], done: ['complete', 'complete', 'current'] }[phase];
  const lab = ['Perfil', 'Preferencias', 'Resultados'];
  const phaseLabel = { profile: 'perfil', preferences: 'preferencias', done: 'completada' }[phase];
  return `<header class="chat-top"><div class="chat-top-row"><a href="welcome.html" class="chat-back" aria-label="Volver al inicio">${icon('arrowLeft')}</a><div class="chat-top-title"><p class="chat-top-brand">WorkBridge</p><h1>Conversemos sobre ti</h1></div><p class="chat-top-count" aria-hidden="true">${filled}/13</p></div><div class="chat-steps" role="group" aria-label="Fase ${phaseLabel}"><ol>${st.map((s, i) => `<li class="chat-step is-${s}"${s === 'current' ? ' aria-current="step"' : ''}><span class="chat-step-bar" aria-hidden="true"></span><span class="chat-step-label">${s === 'complete' ? icon('check') : ''}${lab[i]}${s === 'complete' ? '<span class="sr-only"> (completado)</span>' : ''}</span></li>`).join('')}</ol></div></header>`;
};
const chatShell = (phase, filled, transcript, { activity = '', draft = '', pending = '', listening = false, voiceError = '' } = {}) => `${publicHeader()}<main class="chat-page">
${chatHeader(phase, filled)}
<section class="chat-transcript" role="log" aria-live="polite" aria-label="Conversación">${transcript}${activity ? `<p class="chat-activity" role="status"><span class="typing-dots" aria-hidden="true">•••</span> ${activity}</p>` : ''}</section>
<form class="chat-composer" onsubmit="return false">
${pending ? `<div class="chat-pending">${pending}</div>` : ''}
<label class="sr-only" for="chat-message">Escribe tu respuesta</label>
<div role="status">${listening ? '<p class="chat-voice-banner">Te escucho… toca para terminar</p>' : ''}${voiceError ? `<p class="chat-voice-error">${voiceError}</p>` : ''}</div>
<div class="chat-bar">
<button type="button" class="chat-attach" aria-label="Adjuntar CV"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></button>
<textarea class="chat-input" id="chat-message" rows="1" placeholder="Escribe tu respuesta…">${draft}</textarea>
<button type="button" class="chat-voice${listening ? ' is-listening' : ''}" aria-label="${listening ? 'Detener grabación' : 'Hablar'}" aria-pressed="${listening}">${icon(listening ? 'square' : 'mic')}</button>
<button type="submit" class="chat-send" aria-label="Enviar"${draft.trim() ? '' : ' disabled'}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.7 3.3 21 12 3.7 20.7l1.6-6.6L14 12 5.3 9.9z"/></svg><span class="chat-send-label">Enviar</span></button>
</div>
<p class="chat-composer-hint">Enter envía · Shift+Enter agrega una línea · el clip adjunta un PDF o una foto · el micrófono dicta</p>
</form>
</main>`;
const HELLO = '¡Hola! Soy WorkBridge 👋 Te voy a hacer unas preguntas para conocer lo que sabes hacer. También puedes preguntarme lo que quieras. ¿Cómo te llamo?';
const RESULT_MSG = 'Listo, Valeria. Encontré 4 habilidades y 1 experiencia, ¡incluida tu experiencia informal! 💪 Algunos datos los vamos a confirmar contigo en Mi perfil.';
const SKILLS4 = ['Atención al cliente', 'Manejo de caja', 'Inventario', 'Redes sociales'];
page('chat-inicio', 'Chat: inicio', chatShell('profile', 0, bubble('assistant', HELLO, { chips: ['Prefiero no decirlo'] })), 'Ruta real: /chat (ChatScreen + ChatHeader). Primera pantalla: flecha de regreso, contador 0/13 y pasos Perfil / Preferencias / Resultados.');
page('chat-grabando', 'Chat: grabando voz', chatShell('profile', 2,
  bubble('assistant', HELLO) + bubble('user', 'Valeria') + bubble('assistant', 'Mucho gusto, Valeria. Cuéntame qué has hecho: trabajos, ayudar en un negocio, cursos, lo que sea.'),
  { listening: true }),
  'Estado de grabación: VoiceButton con aria-pressed y anillo rosa pulsante (.chat-voice.is-listening), banner «Te escucho…». El estado de error (.chat-voice-error) se ve en la franja amarilla de abajo del chat-conversación.');
page('chat-conversacion', 'Chat: conversación', chatShell('preferences', 8,
  bubble('assistant', HELLO) +
  bubble('user', 'Valeria') +
  bubble('assistant', 'Mucho gusto, Valeria. ¿Tienes un CV o una hoja de vida?') +
  bubble('user', 'Subí mi CV: CV_Valeria_Rios.pdf', { attach: `<div class="chat-attachment is-user">${attachChip('CV_Valeria_Rios.pdf', '184 KB')}</div>` }) +
  bubble('assistant', RESULT_MSG, { skills: SKILLS4 }) +
  bubble('user', 'Ayudaba en la tienda de mi tía los fines de semana') +
  bubble('assistant', '¿En qué zona te queda bien trabajar?', { chips: ['Panamá (ciudad)', 'San Miguelito', 'Panamá Oeste', 'Otra'] }) +
  bubble('user', 'San Miguelito') +
  bubble('assistant', '¿Cómo prefieres trabajar?', { chips: ['Presencial', 'Híbrido', 'Desde casa'] }),
  { activity: 'Estoy leyendo lo que me contaste…', draft: 'Presencial, de preferencia cerca de mi casa', voiceError: 'No pudimos usar el micrófono. Revisa el permiso del navegador.', pending: `<div role="listitem" style="grid-column: 1 / -1">${attachChip('foto_certificado_excel.jpg', '2,4 MB', { kind: 'image', remove: true })}</div>` }),
  'Chat a mitad de conversación: fase Preferencias (8/13), chips, mensaje de resultado con skills, adjunto pendiente, borrador, error de micrófono y barra compacta (adjuntar + texto + micrófono + enviar).');
page('chat-resultado', 'Chat: CV leído (skills)', chatShell('done', 13,
  bubble('assistant', '¿Subes tu CV o prefieres contármelo?', { chips: ['Lo subo ahora', 'Te lo cuento'] }) +
  bubble('user', 'Subí mi CV: CV_Valeria_Rios.pdf', { attach: `<div class="chat-attachment is-user">${attachChip('CV_Valeria_Rios.pdf', '184 KB')}</div>` }) +
  bubble('assistant', RESULT_MSG, { skills: SKILLS4 }) +
  bubble('assistant', 'Ya tengo lo que necesito. Te estoy buscando vacantes…', { chips: [] }) +
  bubble('assistant', 'No pude buscar vacantes todavía. Puedes intentarlo de nuevo.', { chips: ['Reintentar'] }),
  { activity: 'Estoy buscando vacantes…' }),
  'Variante «resultado con skills»: mensaje de resultado de lectura de CV con .chat-skill-chips, fase completada (13/13, los tres pasos en verde/rosa) y chip Reintentar.');

/* ------------------------------------------------------------------ 3. vacantes */
{
  const toast = (t) => `<div class="xp-toast" role="status">${t}</div>`;
  const head = (n, lead) => pageHead('Hola, Valeria', n === 0 ? 'Aún no hay vacantes para ti' : `${n} vacantes para ti`, lead, { extra: n > 0 ? `<div class="xp-head-actions">${button('Guardar esta búsqueda', { variant: 'outline' })}</div>` : '' });
  const fresh = [{ ...VACANCIES[0], fresh: 'Hace 40 minutos' }, { ...VACANCIES[3], fresh: 'Hace 2 horas', score: 71 }];
  const rest = VACANCIES.filter((v) => !fresh.some((f) => f.title === v.title));
  const main = (extra = '') => `<main class="vacantes-page xp-page">
${extra ? '' : toast('Búsqueda guardada. La verás en Mi perfil.')}
${head(6, 'Revisamos 20 · actualizado hace 2 h')}
<section aria-labelledby="new-heading"><h2 id="new-heading" class="xp-section-title">Nuevas desde tu última visita</h2>${grid(fresh.map((v) => vacancyCard(v, { isNew: true })))}</section>
<section aria-labelledby="matches-heading"><h2 id="matches-heading" class="xp-section-title">Todas tus vacantes</h2>${grid(rest.map((v, i) => vacancyCard(v, { loading: i === rest.length - 1 })))}</section>
<p class="xp-discard">14 vacantes no encajan, sobre todo por: Fuera de tu zona de traslado (9), Salario menor al mínimo (5).</p>
${extra}
</main>`;
  page('vacantes', 'Vacantes', candidateShell('vacantes', main(), 2), 'Ruta real: /vacantes (components/VacantesView.tsx). Cards .xp-card con chips, barra de preparación y «Te falta» (máx. 2); la última muestra el esqueleto de preparación. Toast .xp-toast fijo abajo a la derecha.');

  const have = ['Experiencia atendiendo clientes en negocio familiar.', 'Manejo de caja y cobros.'];
  const miss = ['Excel básico: la vacante lo pide y no aparece en tu perfil.', 'Disponibilidad los sábados hasta las 8 p. m.'];
  const sheet = `<!--M--><div class="fixed inset-0 z-50 bg-black/50 pv-below" data-state="open"></div>
<div role="dialog" aria-modal="true" aria-labelledby="sheet-title" data-state="open" class="fixed z-50 flex flex-col gap-4 border-ink bg-card p-6 shadow-[-8px_0_0_var(--shadow-color)] inset-y-0 right-0 h-full w-3/4 border-l-[3px] sm:max-w-sm xp-sheet pv-below">
  <h2 id="sheet-title" class="text-lg font-normal">Auxiliar de ventas</h2>
  <p id="vacancy-sheet-desc" class="text-sm text-muted-foreground">Supermercados Del Istmo · Presencial · Hace 3 horas</p>
  <dl class="xp-facts"><div><dt>Ubicación</dt><dd>Bella Vista, Ciudad de Panamá</dd></div><div><dt>Salario</dt><dd>USD 620 – 700 / mes</dd></div></dl>
  <section aria-labelledby="sheet-ready"><h3 id="sheet-ready">Tu preparación</h3>${xpReady(82)}</section>
  <section aria-labelledby="sheet-have"><h3 id="sheet-have">Lo que ya tienes</h3><ul class="xp-missing xp-have">${have.map((h) => `<li>${h}</li>`).join('')}</ul></section>
  <section aria-labelledby="sheet-missing"><h3 id="sheet-missing">Lo que te falta</h3><ul class="xp-missing">${miss.map((h) => `<li>${h}</li>`).join('')}</ul><p class="xp-muted" style="margin-top:.5rem"><a class="xp-course-link" href="ruta.html">Ver cómo cerrar estas brechas</a></p></section>
  <section aria-labelledby="sheet-skills"><h3 id="sheet-skills">Lo que piden</h3><ul class="xp-skill-list">${['Atención al cliente', 'Caja', 'Excel básico'].map((s) => `<li class="xp-chip xp-chip-plain">${s}</li>`).join('')}</ul></section>
  <p class="xp-muted">Fuente: Encuentra24 · Hace 3 horas</p>
  <div class="xp-actions">
    ${buttonLink('Preparar mi postulación', 'postulaciones-nueva.html', { size: 'lg' })}
    ${buttonLink('Ver vacante original <span class="sr-only">(se abre en otra pestaña)</span><span aria-hidden="true">↗</span>', '#', { variant: 'outline', size: 'lg' })}
    <div class="xp-actions-row">${button('Guardada ✓', { variant: 'secondary' })}${button('Compartir', { variant: 'secondary' })}</div>
  </div>
  <button type="button" class="absolute right-4 top-4 rounded-md opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">${icon('x', 'size-4')}<span class="sr-only">Cerrar</span></button>
</div><!--/M-->`;
  page('vacantes-detalle', 'Vacantes: detalle', candidateShell('vacantes', main(sheet)), 'Hoja VacancyDetailSheet abierta (?v=…): panel lateral en escritorio y bottom sheet en móvil (.xp-sheet.xp-sheet). Prueba la vista móvil para ver el bottom sheet con tirador. Incluye CTA «Preparar mi postulación».');

  const dialog = modalDialog(`<div class="flex flex-col space-y-2 text-center sm:text-left"><h2 id="d-save" class="text-lg font-normal">Guardar esta búsqueda</h2><p class="text-sm text-muted-foreground">Te avisaremos cuando aparezcan vacantes nuevas para lo que buscas.</p></div><form class="xp-dialog-field" onsubmit="return false">${label('save-name', 'Nombre de la búsqueda')}${input('save-name', { value: 'Atención al cliente en Panamá', placeholder: 'Atención al cliente en Panamá' })}<p role="alert" class="xp-inline-error">No pudimos guardar tu búsqueda. Intenta de nuevo.</p><div class="xp-dialog-actions">${button('Cancelar', { variant: 'outline' })}${button('Guardar')}</div></form>`, 'd-save');
  page('vacantes-guardar', 'Vacantes: guardar búsqueda', candidateShell('vacantes', main(dialog)), 'SaveSearchDialog con error inline.');

  const near = `<section aria-labelledby="near-heading"><h2 id="near-heading" class="xp-section-title">Casi listas para ti</h2><p class="xp-muted" style="margin-bottom:.75rem">Les falta una sola cosa. Si ajustas eso en tus preferencias, podrían encajar.</p><ul class="xp-near-list">
<li class="xp-near"><h3>Asistente de oficina · Grupo Canal</h3><p><strong aria-hidden="true">⚠ </strong>Te bloquea: Queda a 75 min de tu casa y tu límite es 60 min.</p></li>
<li class="xp-near"><h3>Vendedor/a de piso · Casa Moda</h3><p><strong aria-hidden="true">⚠ </strong>Te bloquea: Pide experiencia mínima de 6 meses y tienes 3.</p></li>
<li class="xp-near"><h3>Recepcionista · Hotel Central</h3><p><strong aria-hidden="true">⚠ </strong>Te bloquea: Pagan USD 550 y tu mínimo es USD 600.</p></li></ul></section>`;
  const noMatch = `<section class="xp-panel xp-empty" aria-labelledby="nomatch-heading"><span class="xp-empty-icon" aria-hidden="true">🧭</span><h2 id="nomatch-heading">Aún no encontramos una vacante para ti</h2><p>Revisamos 23 vacantes y ninguna cumple con todo lo que pediste por ahora.</p><div><p><strong>Lo que más te bloqueó:</strong></p><ul class="xp-causes"><li><strong>Fuera de tu zona de traslado</strong> (12 vacantes). Superan tus 60 minutos de viaje.</li><li><strong>Salario menor al mínimo</strong> (8 vacantes). Pagan menos de USD 600.</li></ul></div>${buttonLink('Ver mi ruta →', 'ruta.html', { size: 'lg' })}${buttonLink('Ajustar mis preferencias', 'perfil.html', { variant: 'outline' })}</section>`;
  page('vacantes-vacio', 'Vacantes: sin coincidencias', candidateShell('vacantes', `<main class="vacantes-page xp-page">
${head(0, 'Revisamos 23 · actualizado hace 2 h')}
${noMatch}${near}
<p class="xp-discard">23 vacantes no encajan, sobre todo por: Fuera de tu zona de traslado (12), Salario menor al mínimo (8), Modalidad (3).</p>
</main>`), 'NoMatchPanel + NearMatchList + DiscardSummary (components/exploration). Estados de sesión sin preferencias / error se ven en Mi ruta: vacía.');
}

/* ------------------------------------------------------------------ 4. ruta */
{
  const recs = [
    ['Excel para el trabajo', 'Te ayuda con la brecha de hojas de cálculo que piden Auxiliar de ventas y Asistente administrativo.', 'INADEH', 20, 'Gratis', ['Excel básico']],
    ['Servicio al cliente por teléfono', 'Refuerza atención telefónica, que aparece en 3 de tus vacantes cercanas.', 'Cámara de Comercio de Panamá', 12, 'USD 25', ['Atención telefónica']],
    ['Inglés para atención al cliente', 'Inglés conversacional básico para vacantes en zonas turísticas y centros comerciales.', 'Ciudad del Saber', 40, 'Gratis', ['Inglés conversacional']],
  ].map(([t, e, p, h, c, cov], i) => `<li class="xp-step"><span class="xp-step-num" aria-hidden="true">${i + 1}</span><div class="xp-step-body"><h3><span class="sr-only">Paso ${i + 1}: </span>${t}</h3><div class="xp-step-meta">${xpChip(p, 'plain')}${xpChip(h + ' h', 'yellow')}${xpChip(c, 'mint')}</div><p class="xp-step-covers"><strong>Cubre:</strong>${cov.map((x) => xpChip(x, 'plain')).join('')}</p><p class="xp-step-why">${e}</p><p class="xp-step-why"><a class="xp-course-link" href="#">Ver curso <span class="sr-only">(se abre en otra pestaña)</span>↗</a></p></div></li>`).join('');
  const head = (t, l) => pageHead('Tu siguiente paso', t, l, { tone: 'page-head-mint' });
  page('ruta', 'Mi ruta', candidateShell('ruta', `<main class="ruta-page xp-page">${head('Tu ruta', '3 pasos para acercarte a Auxiliar de ventas')}
<p class="xp-muted">Recomendación basada en tus últimas vacantes. En total: 72 h · USD 25.</p>
<ol class="xp-steps" aria-label="Pasos de tu ruta">${recs}</ol>
<div class="xp-panel"><h3 class="xp-section-title" style="font-size:1rem">Todavía sin curso</h3><ul class="xp-skill-list"><li class="xp-chip xp-chip-plain">Manejo de punto de venta</li></ul></div>
${buttonLink('Volver a mis vacantes', 'vacantes.html', { variant: 'outline' })}
</main>`, 2), 'Ruta real: /ruta (RutaView + exploration/RoadmapList). Pasos numerados con conector vertical, chips de proveedor/horas/costo y brechas que cubre.');
  const state = (note, inner) => `<p class="pv-note" style="margin-top:2rem">${note}</p>${inner}`;
  const panel = (icn, h, p, extra = '', cls = '') => `<section class="xp-panel ${cls} xp-empty"${cls.includes('warn') ? ' role="alert"' : ' role="status"'}>${icn ? `<span class="xp-empty-icon" aria-hidden="true">${icn}</span>` : ''}<h2>${h}</h2><p>${p}</p>${extra}</section>`;
  const h2 = head('Mi ruta', 'Cursos para acercarte a las vacantes que buscas.');
  page('ruta-vacia', 'Mi ruta: vacía', candidateShell('ruta', `<main class="ruta-page xp-page">${h2}
${panel('🧭', 'Aún no tienes una ruta', 'Cuéntanos qué buscas y, si hace falta, te sugerimos cursos para llegar ahí.', buttonLink('Empezar', 'chat-inicio.html', { size: 'lg' }))}
${state('Otros estados de /ruta: ya hay vacantes', panel('🎉', 'Ya tienes vacantes para ti', 'Por ahora no necesitas una ruta de cursos. Si algo te falta para una vacante, lo verás en su detalle.', buttonLink('Ver mis vacantes', 'vacantes.html', { size: 'lg' })))}
${state('Capacitación desactivada', panel('📚', 'No armamos una ruta de cursos', 'Dijiste que no quieres tomar cursos. Si cambias de idea, buscamos cursos para cerrar lo que te falta.', button('Me interesa tomar cursos')))}
${state('Sin cursos para las brechas', panel('🔎', 'Todavía no hay cursos para tus brechas', 'No encontramos un curso que encaje con tu horario y lo que te falta. Revisaremos de nuevo cuando haya más opciones.', buttonLink('Ajustar mis preferencias', 'perfil.html', { variant: 'outline' })))}
${state('Error al cargar', panel('', 'No pudimos cargar tu ruta', 'Revisa tu internet y vuelve a intentar.', `<div class="xp-row">${button('Reintentar')}${buttonLink('Contar mi experiencia', 'chat-inicio.html', { variant: 'outline' })}</div>`, 'xp-panel-warn'))}
${state('Cargando', `<div class="xp-steps" aria-hidden="true">${[1, 2].map(() => skeleton('xp-skel').replace('class="', 'style="min-height:8rem" class="')).join('')}</div>`)}
</main>`), 'Estados vacíos de /ruta (RutaView): sin ruta, ya hay vacantes, capacitación desactivada, sin cursos, error y cargando.');
}

/* ------------------------------------------------------------------ 5. perfil */
{
  const days = [['Lun', 1], ['Mar', 1], ['Mié', 1], ['Jue', 1], ['Vie', 1], ['Sáb', 0], ['Dom', 0]].map(([d, c]) => checkLabel(!!c, d)).join('');
  const contracts = [['Tiempo completo', 1], ['Medio tiempo', 1], ['Plazo fijo', 0], ['Pasantía', 0], ['Temporal', 0], ['Freelance', 0]].map(([d, c]) => checkLabel(!!c, d)).join('');
  const modes = [['Transporte público', 1], ['Auto', 0], ['A pie', 1], ['Bicicleta', 0]].map(([d, c]) => checkLabel(!!c, d)).join('');
  const form = `<form id="preferencias" onsubmit="return false" novalidate>
<div class="field">${label('pref-roles', 'Puestos objetivo (separados por coma)')}${input('pref-roles', { value: 'Auxiliar de ventas, Atención al cliente', placeholder: 'Atención al cliente, Ventas' })}</div>
<div class="field-row">
  <div class="field">${label('pref-modality', 'Modalidad')}${selectTrigger('pref-modality', 'Presencial')}</div>
  <div class="field">${label('pref-province', 'Provincia')}${input('pref-province', { value: 'Panamá' })}</div>
  <div class="field">${label('pref-district', 'Distrito')}${input('pref-district', { value: 'San Miguelito' })}</div>
</div>
<div class="field-row"><div class="field">${label('pref-salary', 'Salario mínimo (USD/mes)')}${input('pref-salary', { type: 'number', value: '600' })}</div></div>
<details open><summary>Más opciones</summary>
<div class="field-row">
  <div class="field">${label('pref-travel', 'Traslado máximo (minutos)')}${input('pref-travel', { type: 'number', value: '60' })}</div>
  <div class="field">${label('pref-budget', 'Presupuesto de transporte (USD/mes)')}${input('pref-budget', { type: 'number', value: '40' })}</div>
</div>
<fieldset class="field"><legend>Días disponibles</legend><div class="checkbox-group">${days}</div></fieldset>
<div class="field-row">
  <div class="field">${label('pref-start', 'Hora de inicio')}${input('pref-start', { type: 'time', value: '08:00' })}</div>
  <div class="field">${label('pref-end', 'Hora de fin')}${input('pref-end', { type: 'time', value: '17:00' })}</div>
  <div class="field">${label('pref-weekly', 'Horas semanales')}${input('pref-weekly', { type: 'number', value: '40' })}</div>
</div>
<fieldset class="field"><legend>Tipo de contrato</legend><div class="checkbox-group">${contracts}</div></fieldset>
<fieldset class="field"><legend>Modos de transporte</legend><div class="checkbox-group">${modes}</div></fieldset>
<fieldset class="field"><legend>Disposición</legend><div class="checkbox-group">${checkLabel(true, ' Me interesa tomar cursos')}${checkLabel(false, ' Me interesa hacer pasantías')}</div></fieldset>
</details>
${button('Guardar cambios', { type: 'submit' })}
</form>`;
  const exp = (t, m) => `<li><strong>${t}</strong><span class="xp-muted">${m}</span></li>`;
  const body = () => `<main class="profile-page xp-page">
${pageHead('Tu información', 'Mi perfil', 'Revisa lo que sabemos de ti y ajusta lo que buscas. Tus vacantes se actualizan al guardar.', { tone: 'page-head-sky', extra: `<div class="xp-head-actions">${signOut()}</div>` })}
<div class="xp-profile-cols">
  <section class="xp-panel" aria-labelledby="skills-heading"><h2 id="skills-heading" class="xp-section-title">Lo que sabes hacer</h2>
    <ul class="xp-skill-list" aria-label="Tus habilidades">${SKILLS4.map((s) => `<li class="xp-chip xp-chip-yellow">${s}</li>`).join('')}</ul>
    <h3 class="xp-section-title" style="font-size:1rem;margin-top:1.25rem">Experiencias</h3>
    <ul class="xp-exp-list">${exp('Ayudante en tienda familiar', 'Negocio familiar · Relevante')}${exp('Voluntariado en feria escolar', 'Voluntariado · Parcialmente relevante')}</ul>
    <div style="margin-top:1rem">${buttonLink('Actualizar con el chat', 'chat-inicio.html', { variant: 'secondary' })}</div>
  </section>
  <section class="xp-panel" aria-labelledby="prefs-heading"><h2 id="prefs-heading" class="xp-section-title">Lo que buscas</h2>${form}
    <ul class="xp-inline-error" role="alert" aria-label="Errores de validación" style="list-style:none;margin:1rem 0 0"><li>El salario mínimo debe ser mayor a 0.</li></ul>
    <div aria-live="polite" role="status"><p class="success">Actualizamos tus vacantes. <a class="xp-course-link" href="vacantes.html">Ver mis vacantes</a></p></div>
  </section>
</div>
<section class="xp-panel" aria-labelledby="searches-heading"><h2 id="searches-heading" class="xp-section-title">Búsquedas guardadas</h2>
  <ul class="xp-search-list"><li><span><strong>Atención al cliente en Panamá</strong><br><span class="xp-muted">6 vacantes ahora</span></span><span class="xp-chip xp-chip-mint">2 nuevas</span></li><li><span><strong>Ventas cerca de San Miguelito</strong><br><span class="xp-muted">1 vacante ahora</span></span><span class="xp-muted">Sin novedades</span></li></ul>
</section>
<section class="xp-panel xp-danger" aria-labelledby="delete-data-heading"><h2 id="delete-data-heading" class="xp-section-title">Tus datos</h2><p class="xp-muted" style="margin-bottom:1rem">Puedes borrar tu perfil, tus preferencias y tus búsquedas guardadas cuando quieras.</p>${button('Eliminar mis datos', { variant: 'destructive' })}</section>
</main>`;
  page('perfil', 'Mi perfil', candidateShell('perfil', body(), 2), 'Ruta real: /perfil (ProfileView + exploration/PreferencesForm + SavedSearches). «Más opciones» es un <details> (aquí abierto); aparecen error de validación y mensaje de éxito a la vez solo para mostrar ambos estilos.');
  const alertDlg = modal(`<div class="flex flex-col gap-2"><h2 id="d-del" class="text-lg font-normal">¿Eliminar todos tus datos?</h2><p class="text-sm text-muted-foreground">Vamos a borrar tu perfil, tus preferencias y tus búsquedas guardadas. No se puede deshacer. Las postulaciones que ya enviaste se conservan como registro.</p></div><p role="alert" class="xp-inline-error">No pudimos eliminar tus datos. Intenta de nuevo.</p><div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">${button('Cancelar', { variant: 'outline' })}${button('Sí, eliminar', { variant: 'destructive' })}</div>`, 'd-del').replace('role="dialog"', 'role="alertdialog"');
  page('perfil-eliminar', 'Perfil: eliminar datos', candidateShell('perfil', body() + alertDlg, 2), 'AlertDialog destructivo «¿Eliminar todos tus datos?» (con el error de fallo visible). El foco inicial va a Cancelar.');
}

/* ------------------------------------------------------------------ 6. postulaciones (J7) */
const ST = {
  rejected: { label: 'Rechazada', tone: 'danger', color: 'pink', icon: 'no', hint: 'Esta postulación fue rechazada y no se puede enviar.' },
  interview_approved: { label: 'Entrevista aprobada', tone: 'success', color: 'mint', icon: 'userCheck', hint: 'La empresa te contactará.' },
  interview_rejected: { label: 'No avanzó', tone: 'neutral', color: 'muted', icon: 'dot', hint: 'Esta vez no avanzó. Mira tu ruta para prepararte mejor.' },
  sent: { label: 'Enviada', tone: 'accent', color: 'sky', icon: 'send', hint: 'La empresa está revisando tu postulación.' },
  draft: { label: 'Borrador', tone: 'warning', color: 'yellow', icon: 'file', hint: 'Revisa y aprueba tu postulación.' },
  counselor_review: { label: 'En revisión del orientador', tone: 'warning', color: 'yellow', icon: 'hourglass', hint: 'Tu orientador/a todavía está revisando esta postulación.' },
  ready: { label: 'Lista para enviar', tone: 'success', color: 'mint', icon: 'ok', hint: 'Todo está listo. Tú decides cuándo enviarla.' },
};
const statusBadge = (s) => badge(`${icon(ST[s].icon, 'mr-1 size-3.5')}${ST[s].label}`, ST[s].tone, 'sticker-tag app-status-badge');
const appRow = (title, s, when) => `<li><a class="queue-row app-row" href="postulaciones-${{ draft: 'borrador', counselor_review: 'revision', ready: 'lista' }[s] || 'final'}.html" style="--status: var(--${ST[s].color})"><span class="queue-row-top"><span class="queue-row-title">${title}</span>${icon('chevron', 'app-row-chevron')}</span><span class="app-row-meta">${statusBadge(s)}<span class="app-row-time">Actualizada ${when}</span></span><span class="app-row-hint">${ST[s].hint}</span></a></li>`;
const appHead = (eyebrow, h1, lead, tone) => pageHead(eyebrow, h1, lead, { tone });
const failureBlock = (title, msg, action) => `<section class="app-failure" role="alert"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="app-failure-icon">${ICONS.alert}</svg><div class="grid gap-1"><h2 class="app-failure-title">${title}</h2><p>${msg}</p></div><div class="app-failure-actions">${action}</div></section>`;
const skeletonList = (label, hs) => `<div class="app-skeleton-list" role="status" aria-label="${label}">${hs.map((h) => skeleton(`${h} w-full`)).join('')}</div>`;

const ROWS = [
  ['Cajero/a · Farmacia La Salud', 'ready', 'hace 20 min'],
  ['Auxiliar de ventas · Supermercados Del Istmo', 'counselor_review', 'hace 2 h'],
  ['Atención al cliente · Conecta Panamá', 'draft', 'hace 1 día'],
  ['Promotor/a de ventas · Digital Plaza', 'interview_approved', 'hace 3 días'],
  ['Soporte técnico junior · Pixel Taller', 'sent', 'hace 4 días'],
  ['Asistente administrativo · Logística Alameda', 'interview_rejected', 'hace 6 días'],
  ['Recepcionista · Hotel Central', 'rejected', '5 de octubre de 2026'],
];
page('postulaciones', 'Postulaciones: lista', candidateShell('post', `<main class="app-page">
${appHead('Tu progreso', 'Mis postulaciones', 'Tú decides qué se envía. Nunca mandamos nada sin tu permiso.', 'page-head-sky')}
<p class="sr-only" role="status">7 postulaciones</p>
<ul class="queue" aria-label="Mis postulaciones">${ROWS.map((r) => appRow(...r)).join('')}</ul>
</main>`), 'Ruta real: /postulaciones (components/applications/ApplicationsList.tsx). Siete estados con sticker de color en la fila (.queue-row + --status), insignia StatusBadge, hora relativa y pista.');

const timeline = (items) => `<details class="app-timeline-wrap"><summary>Historial (${items.length})</summary><ol class="timeline">${items.map(([a, ac, w]) => `<li class="text-sm"><strong>${a}</strong> ${ac} · <time>${w}</time></li>`).join('')}</ol></details>`;
const frag = (t) => `<p class="doc-fragment" data-source="evidence">${t}</p>`;
const CV = [frag('Valeria Ríos · San Miguelito, Panamá'), frag('Ayudante en tienda familiar (14 meses): atención al cliente, caja e inventario.'), frag('Bachiller en Ciencias. Curso de Excel básico (INADEH).')];
const LETTER = [frag('Hola equipo de Farmacia La Salud: me interesa el puesto de Cajero/a. En la tienda de mi tía aprendí a cobrar con cuidado y a atender con paciencia.')];
const evItem = (text, kind, status, { checked = true, open = true } = {}) => `<li class="evidence-item app-evidence-item">${open ? checkbox(checked) : ''}<label class="${LABEL} app-evidence-text"><span>${text}</span><span class="app-evidence-kind">${kind}</span></label>${badge(status === 'verified' ? 'Verificada' : status === 'unverified' ? 'Sin verificar' : 'Declarada', status === 'verified' ? 'success' : status === 'unverified' ? 'warning' : 'neutral', 'sticker-tag')}</li>`;
const EVID = (open, uncheckLast = false) => `<p class="hint">${open ? 'Solo puedes usar experiencias y certificados que ya declaraste. Si cambias algo, tendrás que volver a aprobar.' : 'Esta es la evidencia que se usó en tu postulación.'}</p><ul class="app-evidence" aria-label="Evidencia">${[
  ['Ayudante en tienda familiar: atención al cliente y caja (14 meses)', 'Experiencia', 'not_applicable', true],
  ['Curso de Excel básico · INADEH', 'Certificación', 'unverified', true],
  ['Bachiller en Ciencias · Colegio Richard Neumann', 'Estudio', 'not_applicable', !uncheckLast],
].map(([t, k, s, c]) => evItem(t, k, s, { checked: c, open })).join('')}</ul>${open && uncheckLast ? `<div class="app-save-bar"><p>Tienes cambios sin guardar.</p>${button('Guardar cambios', { variant: 'secondary' })}</div>` : ''}`;
const gateAside = (reasons) => `<aside class="app-gate" aria-labelledby="app-gate-title"><h2 id="app-gate-title" class="app-gate-title">${icon('alert', 'size-4')} Necesita revisión de tu orientador/a</h2><ul>${reasons.map((r) => `<li>${r}</li>`).join('')}</ul></aside>`;
const detail = ({ title, status, tab = 0, hist = [], gate = [], open = true, dirty = false, actions = '', failure = '', docs = null }) => `<div class="app-detail">
<header class="app-hero" style="--status: var(--${ST[status].color})"><p class="eyebrow">Postulación</p><h1 class="app-title">${title}</h1><div class="app-hero-meta">${statusBadge(status)}<span class="app-hero-hint">${ST[status].hint}</span></div>${hist.length ? timeline(hist) : ''}</header>
<div class="app-columns">
<section class="app-docs" aria-label="Documentos de tu postulación">${gate.length ? gateAside(gate) : ''}${tabs(['CV', 'Carta', 'Evidencia'], tab, docs ?? [`<div class="grid gap-2">${CV.join('')}</div>`, `<div class="grid gap-2">${LETTER.join('')}</div>`, EVID(open, dirty)][tab])}</section>
<aside class="app-actions" aria-label="Acciones de la postulación">${failure ? `<p role="alert" class="error app-action-error">${failure}</p>` : ''}${actions}</aside>
</div></div>`;
const appMain = (inner) => `<main class="app-page"><a href="postulaciones.html" class="back-link app-back">${icon('arrowLeft', 'size-4')} Mis postulaciones</a>${inner}</main>`;
const rejectBtn = button('Rechazar', { variant: 'outline' });
const HIST1 = [['Tú', 'ajustó la evidencia', '17 oct 2026, 9:12 a. m.']];
const HIST2 = [['Tú', 'ajustó la evidencia', '17 oct 2026, 9:12 a. m.'], ['Tú', 'aprobó', '17 oct 2026, 9:20 a. m.']];

page('postulaciones-borrador', 'Postulación: borrador', candidateShell('post', appMain(detail({
  title: 'Atención al cliente · Conecta Panamá', status: 'draft', tab: 2, dirty: true, hist: HIST1,
  failure: 'Primero aprueba tu postulación.',
  actions: `<p class="app-actions-copy">Revisa tu CV, tu carta y tu evidencia. Si todo está bien, apruébala.</p>${button('Aprobar mi postulación', { size: 'lg', disabled: true })}<p class="hint">Guarda tus cambios antes de aprobar.</p>${rejectBtn}`,
}))), 'Ruta real: /postulaciones/[id] (ApplicationDetail). Borrador en la pestaña Evidencia con cambios sin guardar (barra .app-save-bar, aprobar deshabilitado) y error de acción. En escritorio el panel de acciones es columna lateral sticky; en móvil, barra fija sobre la navegación.');

page('postulaciones-revision', 'Postulación: en revisión', candidateShell('post', appMain(detail({
  title: 'Auxiliar de ventas · Supermercados Del Istmo', status: 'counselor_review', tab: 0, hist: HIST2,
  gate: ['Una de tus certificaciones todavía no se pudo verificar.', 'Te falta un requisito importante para este puesto: experiencia con punto de venta.'],
  actions: `<p class="status-banner app-banner" role="status">Tu orientador/a está revisando esta postulación. Te avisaremos aquí cuando esté lista.</p>${rejectBtn}`,
}))), 'Estado «En revisión del orientador»: motivos de la compuerta (.app-gate), banner de espera y pestañas CV/Carta/Evidencia.');

const confirm = modal(`<div class="flex flex-col gap-2"><h2 id="d-send" class="text-lg font-normal">¿Enviar tu postulación a Cajero/a · Farmacia La Salud?</h2><p class="text-sm text-muted-foreground">Se compartirán tu CV, tu carta y tu evidencia con la empresa. No se puede deshacer.</p></div><p role="alert" class="error">Parece que no hay conexión. Revisa tu internet y vuelve a intentar.</p><div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">${button('Cancelar', { variant: 'outline' })}${button('Sí, enviar')}</div>`, 'd-send').replace('role="dialog"', 'role="alertdialog"');
const readyDetail = () => detail({
  title: 'Cajero/a · Farmacia La Salud', status: 'ready', tab: 0, hist: [...HIST2, ['Tu orientador/a', 'aprobó', '17 oct 2026, 10:40 a. m.']],
  actions: `<p class="status-banner status-banner-mint app-banner">Lista para enviar. Tú decides cuándo.</p>${button(`${icon('send')} Enviar postulación`, { size: 'lg' })}${rejectBtn}`,
});
page('postulaciones-lista', 'Postulación: lista + confirmar', candidateShell('post', appMain(readyDetail()) + confirm), 'Estado «Lista para enviar» con el AlertDialog de confirmación de envío abierto (con error de red visible). Nada se manda sin este segundo clic.');

{
  const sent = (status, line, extra) => `<p class="pv-note" style="margin-top:2rem">${ST[status].label}</p>` + detail({
    title: { sent: 'Soporte técnico junior · Pixel Taller', interview_approved: 'Promotor/a de ventas · Digital Plaza', interview_rejected: 'Asistente administrativo · Logística Alameda', rejected: 'Recepcionista · Hotel Central' }[status],
    status, tab: 2, open: false, hist: [...HIST2, ['Tu orientador/a', 'aprobó', '12 oct 2026, 10:40 a. m.'], ['Tú', 'envió la postulación', '12 oct 2026, 10:52 a. m.']],
    actions: `<div class="${status === 'rejected' ? 'app-rejected' : 'app-sent'}"${status === 'rejected' ? ' role="status"' : ''}>${line}${extra}</div>`,
  });
  page('postulaciones-final', 'Postulación: estados finales', candidateShell('post', appMain(
    sent('sent', '<p class="app-sent-line">Enviada el 12 de octubre de 2026</p>', '<p class="hint">La empresa está revisando tu postulación. Verás aquí cuando haya respuesta.</p>') +
    sent('interview_approved', '<p class="app-sent-line">Enviada el 12 de octubre de 2026</p>', '<p class="status-banner status-banner-mint app-banner">Entrevista aprobada. La empresa te contactará.</p>') +
    sent('interview_rejected', '<p class="app-sent-line">Enviada el 12 de octubre de 2026</p>', `<p class="app-actions-copy">Esta vez no avanzó. Puedes prepararte mejor con tu ruta de capacitación.</p>${buttonLink(`${icon('route')} Ver mi ruta`, 'ruta.html')}`) +
    sent('rejected', '<p class="app-sent-line">Rechazada</p>', `<p>La rechazó tu orientador/a: “El certificado de Excel no se pudo verificar.”</p>${buttonLink('Ver otras vacantes', 'vacantes.html', { variant: 'outline' })}`),
  )), 'Estados finales (el cuerpo es el mismo en cada uno, sin casillas): Enviada, Entrevista aprobada, No avanzó (con enlace a Mi ruta) y Rechazada con el motivo de quién la rechazó.');
}

page('postulaciones-vacia', 'Postulaciones: vacía y error', candidateShell('post', `<main class="app-page">
${appHead('Tu progreso', 'Mis postulaciones', 'Tú decides qué se envía. Nunca mandamos nada sin tu permiso.', 'page-head-sky')}
<section class="empty-state app-empty"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="app-empty-icon">${ICONS.file}</svg><h2 class="app-empty-title">Todavía no has preparado ninguna postulación</h2><p>Encuentra una vacante que te guste y prepara tu postulación en un par de toques.</p>${buttonLink('Ver vacantes', 'vacantes.html')}</section>
<p class="pv-note">Error de red / servicio (reintentar)</p>
${failureBlock('No pudimos cargar tus postulaciones', 'Parece que no hay conexión. Revisa tu internet y vuelve a intentar.', button('Reintentar'))}
<p class="pv-note">Sin permiso (403): lleva al inicio</p>
${failureBlock('No pudimos cargar esta postulación', 'No tienes acceso a esta página.', buttonLink('Ir al inicio', 'welcome.html'))}
<p class="pv-note">Cargando</p>
${skeletonList('Cargando tus postulaciones', ['h-24', 'h-24', 'h-24'])}
</main>`), 'Estados de /postulaciones sin datos: vacío, errores (QueryFailure, con acción según el error: reintentar / ingresar / inicio) y esqueleto de carga.');

page('postulaciones-nueva', 'Postulación: preparando', candidateShell('post', `<main class="app-page">
${appHead('Un momento', 'Preparando tu postulación', 'Armamos tu CV y tu carta solo con lo que ya nos contaste. Todavía no se envía nada.', 'page-head-mint')}
${skeletonList('Preparando tu postulación', ['h-24', 'h-40'])}
<p class="pv-note">Error al preparar</p>
${failureBlock('No pudimos preparar tu postulación', 'El servicio de postulaciones no está disponible por ahora. Intenta más tarde.', button('Reintentar'))}
<p class="pv-note">Vacante no disponible</p>
<section class="empty-state app-empty" role="alert"><h1 class="app-empty-title">Esa vacante ya no está disponible</h1><p>No pudimos encontrar los datos de esta vacante. Elige otra desde la lista.</p>${buttonLink('Ver vacantes', 'vacantes.html')}</section>
</main>`), 'Ruta real: /postulaciones/nueva?vacancy=… (NewApplication): estado de carga, error y vacante no disponible.');

/* ------------------------------------------------------------------ 7. orientador (J8) + empresa (J9) */
const queueRow = (href, inner, status) => `<li><a href="${href}" class="queue-row" style="--status: var(${status})">${inner}</a></li>`;
const gate = (reasons) => `<ul class="flex flex-wrap gap-2" aria-label="Motivos de revisión">${reasons.map((r) => `<li>${badge(`${icon('alert', 'mr-1 size-3')}${r}`, 'warning', 'sticker-tag')}</li>`).join('')}</ul>`;
const rlChip = (t, n, pressed) => `<li><button type="button" class="rl-chip" aria-pressed="${pressed}">${t} <span class="rl-chip-n">${n}</span></button></li>`;
const rlSort = `<label class="rl-sort">Ordenar<select><option>Más recientes primero</option><option>Más antiguas primero</option></select></label>`;
const failure = (msg, { signin = false, retry = false, back = '' } = {}) => `<div class="rl-failure"><p role="alert" class="error">${msg}</p><div class="rl-failure-actions">${signin ? '<a class="back-link" href="ingresar.html">Ir a ingresar</a>' : ''}${retry ? button('Reintentar', { variant: 'outline' }) : ''}${back}</div></div>`;
const roleShell = (role, inner) => `<div class="min-h-dvh">${roleHeader(role)}${inner}</div>`;
const VERIF = {
  verified: ['ok', 'Verificada', 'success'], declared: ['check', 'Declarada', 'neutral'], unverified: ['help', 'Sin verificar', 'warning'], rejected: ['no', 'Rechazada', 'danger'],
};
const verif = (s) => badge(`${icon(VERIF[s][0], 'mr-1 size-3')}${VERIF[s][1]}`, VERIF[s][2], 'sticker-tag');

{
  const drafts = [
    ['Valeria R.', 'Auxiliar de ventas', ['Credencial sin verificar'], 'El certificado de Excel no tiene verificación de la institución.', 'hace 2 h'],
    ['Diego M.', 'Soporte técnico junior', ['Brecha crítica', 'Transporte inviable'], 'La vacante exige experiencia con redes y no hay evidencia.', 'hace 5 h'],
    ['Camila T.', 'Atención al cliente', ['Alerta de sesgo'], 'La vacante pide «buena presencia» sin definirla.', 'hace 1 día'],
    ['Andrés P.', 'Promotor/a de ventas', ['Brecha crítica'], 'Pide 6 meses de experiencia en ventas y declara 3.', 'hace 2 días'],
    ['Lucía G.', 'Cajero/a', ['Credencial sin verificar'], 'El diploma de inglés B1 no tiene verificación.', 'hace 3 días'],
  ];
  const rows = drafts.map(([n, v, g, d, w]) => queueRow('orientador-detalle.html', `<p class="queue-row-title">${n} · ${v}</p>${gate(g)}<div class="rl-row-meta"><span class="rl-row-detail">${d}</span><span>Esperando ${w}</span></div>`, '--pink')).join('');
  const toolbar = `<div class="rl-toolbar"><ul class="rl-filters" aria-label="Filtrar por motivo">${rlChip('Todas', 5, true)}${rlChip('Brecha crítica', 2, false)}${rlChip('Credencial sin verificar', 2, false)}${rlChip('Alerta de sesgo', 1, false)}${rlChip('Transporte inviable', 1, false)}</ul>${rlSort}</div>`;
  const head = (n) => `<header class="page-head page-head-pink page-head-row"><h1>Pendientes de revisión</h1><div class="flex flex-wrap items-center gap-3"><p class="rl-count">${n} pendientes</p></div></header>`;
  page('orientador', 'Orientador: cola', roleShell('counselor', `<main class="grid gap-4">${head(5)}<div class="grid gap-4">${toolbar}<ul class="queue" aria-label="Pendientes de revisión">${rows}</ul></div>
<p class="pv-note" style="margin-top:2rem">Filtro sin resultados</p><p class="empty-state">Ninguna postulación coincide con este filtro.</p>
<p class="pv-note">Cola vacía</p><p class="empty-state">No hay postulaciones esperando tu revisión 🎉</p>
<p class="pv-note">Cargando</p>${skeleton('h-24 w-full')}
<p class="pv-note">Error al cargar (5xx)</p>${failure('No pudimos cargar las postulaciones. Intenta de nuevo en un momento.', { retry: true })}
</main>`), 'Ruta real: /orientador (CounselorQueue + RoleHeader). Chips de filtro con conteo (aria-pressed), selector de orden, contador «n pendientes», detalle y tiempo de espera por fila. Abajo: estados sin resultados, vacío, cargando y error.');

  const tl = [
    ['Candidato/a', 'corrigió el borrador', '17 oct 2026, 9:12 a. m.', 'Quité un dato de contacto'],
    ['Candidato/a', 'aprobó', '17 oct 2026, 9:20 a. m.', ''],
  ].map(([a, ac, w, r]) => `<li class="text-sm"><strong>${a}</strong> ${ac} · <time>${w}</time>${r ? `<span class="rl-history-reason">“${r}”</span>` : ''}</li>`).join('');
  const fragR = (t, src, ev) => `<div class="doc-fragment rl-fragment"><p class="m-0">${t}</p><div class="rl-fragment-meta">${badge(src, 'neutral', 'sticker-tag')}${ev.map(verif).join('')}</div></div>`;
  const evid = `<ul class="grid gap-3 p-0">${[['Curso de Excel básico (INADEH)', 'unverified'], ['Bachiller en Ciencias', 'verified'], ['Voluntariado en feria escolar', 'declared'], ['Diploma de inglés B2', 'rejected']].map(([t, s]) => `<li class="evidence-item"><span>${t}</span>${verif(s)}</li>`).join('')}</ul>`;
  const gates = [['Credencial sin verificar', 'El certificado de Excel no tiene verificación de la institución.', 'Compara la credencial con la evidencia declarada antes de decidir.'], ['Brecha crítica', 'La vacante exige experiencia con punto de venta y no hay evidencia.', 'Revisa si el requisito que falta realmente excluye a la persona.']];
  const review = ({ outcome = null, tab = 0, saving = '', fail = '', reason = 'Verifiqué por llamada con el INADEH que el certificado es real.' } = {}) => `<main><div class="grid gap-6">
<a href="orientador.html" class="back-link">Volver a pendientes</a>
<header class="page-head page-head-pink grid gap-3"><h1>Valeria R. → Auxiliar de ventas</h1>${gate(['Credencial sin verificar', 'Brecha crítica'])}<p class="m-0 text-sm font-bold">Esperando tu revisión hace 2 h</p></header>
<div class="rl-layout">
<div class="rl-main">
${tabs(['CV', 'Carta', 'Evidencia <span aria-hidden="true">(4)</span>'], tab, tab === 2 ? evid : `<div class="grid gap-2">${fragR('Valeria Ríos · San Miguelito, Panamá', 'Evidencia', [])}${fragR('Ayudante en tienda familiar (14 meses): atención al cliente, caja e inventario.', 'Evidencia', ['declared'])}${fragR('Curso de Excel básico (INADEH), 20 horas.', 'Evidencia', ['unverified'])}${fragR('Cumplo con la jornada que pide la vacante.', 'Coincidencia', [])}</div>`)}
<section aria-labelledby="historial" class="grid gap-2"><h2 id="historial" class="rl-section-title">Historial</h2><ol class="timeline">${tl}</ol></section>
</div>
<aside class="rl-aside" aria-label="Revisión y decisión">
<section aria-labelledby="motivos" class="grid gap-2"><h2 id="motivos" class="rl-section-title">Por qué llegó a ti</h2><ul class="rl-gate-list">${gates.map(([t, d, h]) => `<li class="rl-gate"><strong>${t}</strong><p>${d}</p><p class="rl-gate-hint">${h}</p></li>`).join('')}</ul></section>
${outcome ? `<div class="grid gap-2">${badge(outcome === 'a' ? 'Aprobada' : 'Rechazada', 'neutral', `sticker-tag w-fit rl-state ${outcome === 'a' ? 'rl-state-approved' : 'rl-state-rejected'}`)}<p role="status" class="status-banner status-banner-mint">${outcome === 'a' ? 'Aprobaste esta postulación.' : 'Rechazaste esta postulación.'}</p><a href="orientador.html" class="back-link">Siguiente pendiente</a></div>`
  : `<form class="decision-panel" onsubmit="return false"><label for="motivo" class="${LABEL}">Motivo de tu decisión*</label>${textarea('motivo', { value: reason, rows: 4 })}<p id="motivo-ayuda" class="rl-reason-meta"><span>Escribe al menos 10 caracteres.</span><span aria-hidden="true">${reason.trim().length}/10</span></p>${saving ? `<p role="status" class="note-sticker rl-saving">${saving}</p>` : ''}${fail}<div class="rl-actions">${button('Rechazar', { variant: 'outline' })}${button('Aprobar')}</div></form>`}
</aside>
</div></div></main>`;
  page('orientador-detalle', 'Orientador: revisión', roleShell('counselor', review({ saving: 'Guardando: Aprobada…' })), 'Ruta real: /orientador/[draftId] (CounselorReview). Dos columnas en escritorio: documentos con insignias de verificación + historial a la izquierda; panel de decisión sticky («Por qué llegó a ti», motivo con contador, estado guardando) a la derecha. En móvil se apila.');
  page('orientador-decidida', 'Orientador: decisión tomada', roleShell('counselor', review({ outcome: 'a', tab: 2 })) + `<div class="pv-note" style="margin-top:0">Variante Rechazada abajo</div>` + roleShell('counselor', review({ outcome: 'r' })).replace(/^<div class="min-h-dvh"><header.*?<\/header>/s, '<div class="min-h-dvh">'), 'Estados de decisión: «Aprobada» (pestaña Evidencia con VerificationBadge: verificada, declarada, sin verificar, rechazada) y «Rechazada», con banner de confirmación y enlace «Siguiente pendiente».');
  const failBlocks = [
    ['401 · sesión terminada', failure('Tu sesión terminó. Vuelve a ingresar para continuar.', { signin: true })],
    ['403 · sin permiso', failure('Tu cuenta no tiene permiso para ver esto.', { back: '<a class="back-link" href="orientador.html">Volver a pendientes</a>' })],
    ['404 · no existe', failure('Esta postulación no existe o ya no está disponible.', { back: '<a class="back-link" href="orientador.html">Volver a pendientes</a>' })],
    ['409 · ya decidida por otra persona', failure('Esta postulación ya fue decidida por otra persona. Actualizamos la vista.')],
    ['503 · servicio no disponible', failure('El servicio no está disponible por ahora. Intenta de nuevo en un momento.', { retry: true })],
    ['Error genérico al guardar', failure('No pudimos guardar tu decisión. Intenta de nuevo.', { retry: true })],
  ];
  page('orientador-error', 'Orientador: errores 401/409/5xx', roleShell('counselor', `<main class="grid gap-6"><a href="orientador.html" class="back-link">Volver a pendientes</a><header class="page-head page-head-pink"><h1>Errores de carga y decisión</h1></header>
<div class="rl-layout"><div class="rl-main">${failBlocks.slice(0, 3).map(([t, h]) => `<section class="rl-panel"><h2 class="rl-section-title">${t}</h2>${h}</section>`).join('')}</div><aside class="rl-aside">${failBlocks.slice(3).map(([t, h]) => `<section class="rl-panel"><h2 class="rl-section-title">${t}</h2>${h}</section>`).join('')}</aside></div></main>`), 'Componente QueryFailure (counselor): mensaje por tipo de fallo, enlace «Ir a ingresar» en 401, «Reintentar» solo en 5xx/genérico y enlace de regreso. Compartido con Empresa.');
  page('orientador-prohibido', 'Orientador: 403', roleShell('counselor', `<main><div class="grid gap-6"><a href="orientador.html" class="back-link">Volver a pendientes</a><section class="rl-panel" role="alert" style="max-width:36rem"><h1 class="rl-section-title">No pudimos cargar esta postulación</h1>${failure('Tu cuenta no tiene permiso para ver esto.', { back: '<a class="back-link" href="orientador.html">Volver a pendientes</a>' })}</section></div></main>`), 'Respuesta 403 de la API al abrir /orientador/[id]. (Una cuenta de otro rol ni siquiera llega aquí: el layout la manda a «Sin acceso».)');
}

{
  const subs = ['Auxiliar de ventas', 'Cajero/a', 'Atención al cliente', 'Postulación 7f3a91c2'];
  const rows = subs.map((t, i) => queueRow('empresa-detalle.html', `<div class="queue-row-top"><h2 class="queue-row-title">${t}</h2>${badge('Pendiente', 'warning', 'sticker-tag shrink-0')}</div><p class="text-sm text-muted-foreground">Revisar documentos y decidir si pasa a entrevista.</p><p class="rl-row-meta">Referencia ${['7f3a91c2', '2be4d0a9', 'c19f6e33', '7f3a91c2'][i]}</p>`, '--yellow')).join('');
  const toolbar = `<div class="rl-toolbar"><label class="rl-sort">Buscar vacante<input type="search" class="rl-search" placeholder="Ej. Cajero/a"></label>${rlSort}</div>`;
  page('empresa', 'Empresa: cola', roleShell('employer', `<main class="space-y-4"><header class="page-head page-head-mint page-head-row"><h1>Postulaciones</h1><p class="rl-count">4 pendientes</p></header>
<div class="grid gap-4">${toolbar}<ul class="queue" aria-label="Postulaciones pendientes">${rows}</ul></div>
<p class="pv-note" style="margin-top:2rem">Búsqueda sin resultados</p><p class="empty-state">Ninguna postulación coincide con tu búsqueda.</p>
<p class="pv-note">Sin pendientes</p>${card(cardContent('<p class="font-display uppercase">No hay postulaciones pendientes</p>', 'py-8 pt-8 text-center'), 'border-dashed shadow-none')}
<p class="pv-note">Cargando</p><p role="status" class="note-sticker">Cargando postulaciones…</p>
</main>`), 'Ruta real: /empresa (SubmissionQueue + RoleHeader «Empresa»). Búsqueda por vacante, orden, contador «n pendientes» y estados vacíos.');

  const section = (label, tone, texts) => `<div class="rl-doc"><h3 class="rl-doc-head m-0 ${tone}">${label}</h3><div class="rl-doc-body">${texts.map((t) => `<p>${t}</p>`).join('')}</div></div>`;
  const ev = ['Atendió clientes y manejó caja durante 14 meses en negocio familiar.', 'Llevó el inventario semanal de una tienda de abarrotes.', 'Curso de Excel básico (INADEH), 20 horas.'];
  const hist = (items) => `<section aria-labelledby="historial-empresa" class="grid gap-2"><h2 id="historial-empresa" class="rl-section-title">Historial</h2><ol class="timeline">${items.map(([a, w, r]) => `<li class="text-sm"><strong>${a}</strong> · <time>${w}</time>${r ? `<span class="rl-history-reason">“${r}”</span>` : ''}</li>`).join('')}</ol></section>`;
  const detail = ({ outcome = 'pending', done = '', reasonError = false, saving = '', fail = '' } = {}) => {
    const lab = { pending: 'Pendiente', approved: 'Entrevista aprobada', rejected: 'No avanzó' }[outcome];
    const cls = { pending: 'rl-state-pending', approved: 'rl-state-approved', rejected: 'rl-state-rejected' }[outcome];
    const decided = outcome !== 'pending';
    return `<main class="space-y-4"><header class="page-head page-head-mint"><h1>Postulación</h1></header>
<div class="space-y-4"><div class="flex flex-wrap items-center gap-3"><a class="back-link" href="empresa.html">Volver a postulaciones</a><h2 class="rl-section-title">Auxiliar de ventas</h2>${badge(lab, 'neutral', `sticker-tag rl-state ${cls}`)}</div>
<div class="rl-layout"><div class="rl-main">
<section aria-labelledby="documentos-titulo" class="space-y-3"><h2 id="documentos-titulo" class="rl-section-title">Documentos enviados</h2>
${section('CV', 'bg-yellow', ['Valeria Ríos · San Miguelito, Panamá', 'Experiencia: Ayudante en tienda familiar (14 meses). Atención al cliente, caja, inventario.', 'Formación: Bachiller en Ciencias. Curso de Excel básico.'])}
${section('Carta', 'bg-pink', ['Hola equipo de Supermercados Del Istmo: me interesa el puesto de Auxiliar de ventas. En la tienda de mi tía aprendí a atender con paciencia y a cuidar el inventario.'])}
${section('Postulación', 'bg-mint', ['Disponible de lunes a sábado. Salario esperado: USD 620.'])}</section>
<section aria-labelledby="evidencia-titulo" class="space-y-2"><h2 id="evidencia-titulo" class="rl-section-title">Evidencia aprobada por la persona</h2><ul class="grid gap-2 p-0 text-sm">${ev.map((t) => `<li class="evidence-item">${t}</li>`).join('')}</ul></section>
</div>
<aside class="rl-aside" aria-label="Decisión e historial">
${done ? `<p role="status" class="status-banner status-banner-mint">${done}</p>` : decided ? '<p role="status" class="status-banner">Esta postulación ya fue decidida.</p>'
  : `<form class="decision-panel" aria-label="Decisión de entrevista" onsubmit="return false"><div class="space-y-2"><label for="motivo-e" class="${LABEL}">Motivo de tu decisión*</label>${textarea('motivo-e', { value: reasonError ? '' : 'Perfil acorde: tiene experiencia real en caja e inventario.', rows: 4 })}${reasonError ? '<p role="alert" class="error">Escribe un motivo para continuar.</p>' : ''}</div>${saving ? `<p role="status" class="note-sticker rl-saving">${saving}</p>` : ''}${fail}<div class="rl-actions">${button('No avanzar', { variant: 'outline' })}${button('Aprobar entrevista')}</div></form>`}
${decided ? `<p class="note-sticker">La persona verá «${lab}» en sus postulaciones.</p>` : ''}
${hist(decided ? [['Postulación enviada', '12 oct 2026, 10:52 a. m.', ''], [outcome === 'approved' ? 'Aprobó avanzar' : 'Decidió no avanzar', '17 oct 2026, 11:30 a. m.', outcome === 'approved' ? 'Perfil acorde: tiene experiencia real en caja e inventario.' : 'Buscamos a alguien con experiencia en punto de venta.']] : [['Postulación enviada', '12 oct 2026, 10:52 a. m.', '']])}
</aside></div></div></main>`;
  };
  page('empresa-detalle', 'Empresa: detalle', roleShell('employer', detail({ reasonError: true })), 'Ruta real: /empresa/[submissionId] (SubmissionDecision). Documentos con franja de color a la izquierda, panel de decisión sticky con «No avanzar» / «Aprobar entrevista» (error de validación visible) e historial.');
  page('empresa-decidida', 'Empresa: decidida', roleShell('employer', detail({ outcome: 'approved', done: 'La postulación pasó a entrevista.' })) + `<div class="pv-note" style="margin-top:0">Variante «No avanzó»</div>` + roleShell('employer', detail({ outcome: 'rejected' })).replace(/^<div class="min-h-dvh"><header.*?<\/header>/s, '<div class="min-h-dvh">'), 'Resultados: insignia «Entrevista aprobada» (verde) con banner, y «No avanzó» (rosa) con la nota de lo que verá la persona.');
  page('empresa-error', 'Empresa: errores', roleShell('employer', `<main class="space-y-4"><header class="page-head page-head-mint"><h1>Postulación</h1></header>
<div class="grid gap-4" style="max-width:40rem">
<p class="pv-note">Cola: error 5xx</p>${failure('No pudimos cargar las postulaciones. Intenta de nuevo.', { retry: true })}
<p class="pv-note">Detalle: 403/404 (copy propio de empresa)</p>${card(cardContent(failure('Esta postulación no está disponible para tu organización.', { back: '<a class="back-link" href="empresa.html">Volver a postulaciones</a>' }), 'py-6'))}
<p class="pv-note">Decisión: 401</p>${failure('Tu sesión terminó. Vuelve a ingresar para continuar.', { signin: true })}
<p class="pv-note">Decisión: 409 ya decidida</p>${failure('Esta postulación ya fue decidida por otra persona. Actualizamos la vista.')}
<p class="pv-note">Decisión: 503</p>${failure('El servicio no está disponible por ahora. Intenta de nuevo en un momento.', { retry: true })}
</div></main>`), 'Errores de /empresa: cola, detalle y decisión (QueryFailure compartido con orientador).');
}

/* ------------------------------------------------------------------ 8. acceso y cuenta (J10) */
const signinFoot = `<p class="account-switch">¿Eres orientador/a o empresa? <button type="button" class="link-button">Ingresa aquí</button></p><p class="account-switch">¿Primera vez? <a href="registrarse.html">Crear cuenta</a></p>`;
const signinHero = `<div class="signin-hero"><h1><mark>Guarda tu avance</mark></h1><p class="lead">Crea tu cuenta para postular y volver cuando quieras. Lo que ya me contaste se queda contigo.</p></div>`;
page('ingresar', 'Ingresar', `${publicHeader({ current: 'ingresar' })}<section class="signin-page">
  ${signinHero}
  <div class="signin-card">
    <div class="auth-stack">
      ${button('Continuar con Google', { variant: 'outline', size: 'lg', extra: 'w-full' })}
      <p class="auth-divider" aria-hidden="true">o</p>
      <form class="auth-stack" onsubmit="return false" novalidate>
        <div class="auth-field"><label for="signin-email">Correo</label>${input('signin-email', { type: 'email', value: 'valeria.rios@correo' }).replace('<input ', '<input aria-invalid="true" aria-describedby="signin-email-error" ')}<p id="signin-email-error" class="field-error">Escribe un correo válido, por ejemplo ana@correo.com.</p></div>
        ${button('Enviarme un enlace', { size: 'lg', extra: 'w-full', type: 'submit' })}
      </form>
      <details class="auth-disclosure"><summary>Prefiero usar mi contraseña</summary><form class="auth-stack" onsubmit="return false"><div class="auth-field"><label for="signin-password">Contraseña</label>${input('signin-password', { type: 'password', value: '' })}</div>${button('Ingresar', { variant: 'secondary', size: 'lg', extra: 'w-full', disabled: true })}<p class="account-hint">Escribe tu correo arriba para usar la contraseña.</p></form></details>
    </div>
    <p role="alert" class="error">Ese enlace ya no sirve. Pide uno nuevo y vuelve a intentar.</p>
    ${signinFoot}
  </div>
</section>`, 'Ruta real: /ingresar (SignInForm). Google, enlace mágico con error de correo en línea, contraseña colapsable (<details>) y mensaje de enlace vencido. Con PublicHeader.');
page('ingresar-enlace-enviado', 'Ingresar: enlace enviado', `${publicHeader({ current: 'ingresar' })}<section class="signin-page">
  ${signinHero}
  <div class="signin-card">
    <div class="link-sent" role="status"><h2>Revisa tu correo</h2><p>Te enviamos un enlace a <strong>valeria.rios@correo.com</strong>. Ábrelo en este dispositivo para entrar.</p><div class="link-sent-actions"><button type="button" class="link-button" disabled>Reenviar enlace en 24 s</button><button type="button" class="link-button">Usar otro correo</button></div></div>
    ${signinFoot}
  </div>
</section>`, 'Confirmación del enlace mágico: reenvío bloqueado durante 30 s (aquí a los 24 s) y opción «Usar otro correo».');
{
  const radio = (v, t, b, c) => `<label class="account-type"><input type="radio" name="accountType" value="${v}"${c ? ' checked' : ''}><span>${t}</span><small>${b}</small></label>`;
  const f = (id, lab, extraHtml, err, o = {}) => `<div class="account-field"><label for="${id}">${lab}</label>${input(id, o).replace('<input ', err ? `<input aria-invalid="true" aria-describedby="${id}-error" ` : '<input ')}${extraHtml}${err ? `<p id="${id}-error" class="field-error">${err}</p>` : ''}</div>`;
  page('registrarse', 'Registrarse', `${publicHeader({ current: 'registrarse' })}<section class="register-page"><form class="register-card" onsubmit="return false" novalidate>
<header class="register-head"><p class="eyebrow">Tu cuenta</p><h1>Crear cuenta</h1><p>Elige el tipo de cuenta. Si ya empezaste la conversación como invitado, tu avance se queda contigo.</p></header>
<fieldset class="account-type-field"><legend>Tipo de cuenta</legend><div class="account-type-grid">${radio('student', 'Estudiante regular', 'Conversación, vacantes, ruta y perfil.', true)}${radio('employer', 'Empresarial', 'Panel de postulaciones de la empresa.', false)}</div></fieldset>
${f('register-name', 'Nombre', '', 'Escribe tu nombre.', { value: '' })}
${f('register-email', 'Correo', '', 'Ese correo ya tiene una cuenta. Ingresa con él.', { type: 'email', value: 'valeria.rios@correo.com' })}
${f('register-password', 'Contraseña', '<p class="account-hint">Mínimo 8 caracteres.</p>', 'La contraseña debe tener al menos 8 caracteres.', { type: 'password', value: 'abc123' })}
${f('register-confirm', 'Confirmar contraseña', '', 'Las contraseñas no coinciden.', { type: 'password', value: 'abc12' })}
${button('Crear cuenta', { size: 'lg', extra: 'w-full', type: 'submit' })}
<p role="alert" class="error">Parece que no hay conexión. Revisa tu internet y vuelve a intentar.</p>
<p class="account-switch">¿Ya tienes cuenta? <a href="ingresar.html">Ingresar</a></p>
</form></section>`, 'Ruta real: /registrarse (RegisterForm). Todos los errores por campo a la vez (.field-error, aria-invalid) más el error de red; tipo de cuenta como radios.');
}
page('cuenta', 'Mi cuenta', `${publicHeader({ signedIn: true })}<section class="account-page">
<div class="page-head"><h1>Mi cuenta</h1></div>
<div class="account-card"><dl class="account-list"><div><dt>Correo</dt><dd>valeria.rios@correo.com</dd></div><div><dt>Tipo de cuenta</dt><dd>Estudiante</dd></div></dl><div class="account-actions">${buttonLink('Ir a mi panel', 'vacantes.html', { size: 'lg' })}${button('Cerrar sesión', { variant: 'secondary', size: 'lg' })}</div></div>
<div class="account-card"><h2 class="font-display text-lg uppercase">Mis datos</h2><p>Puedes revisar lo que sabemos de ti o eliminar todos tus datos desde Mi perfil.</p><div class="account-actions">${buttonLink('Ver o eliminar mis datos', 'perfil.html', { variant: 'outline' })}</div></div>
</section>`, 'Ruta real: /cuenta con sesión de cuenta (candidato). Para orientador/a y empresa solo cambia el tipo de cuenta, el destino de «Ir a mi panel» y desaparece la tarjeta «Mis datos».');
page('cuenta-anonima', 'Cuenta: invitado', `${publicHeader()}<section class="signin-page">
<div class="signin-hero"><h1><mark>Tu cuenta</mark></h1><p class="lead">Estás usando WorkBridge como invitado. Crea tu cuenta para guardar tu avance y postular.</p></div>
<div class="signin-card"><a class="auth-nav-link auth-nav-link-signup auth-nav-link-block" href="registrarse.html">Crear cuenta</a><a class="auth-nav-link auth-nav-link-block" href="ingresar.html">Ingresar</a><a class="back-link" href="chat-inicio.html">Seguir como invitado</a><p class="account-hint">Si ya tienes cuenta, al ingresar vinculamos esta sesión a ella y no pierdes lo que ya me contaste.</p></div>
</section>`, '/cuenta como invitado (sesión anónima). Sin sesión alguna el texto cambia a «Ingresa o crea tu cuenta para guardar tu avance, o sigue como invitado.» y no aparece la nota final.');

/* ------------------------------------------------------------------ 9. sistema */
const fallback = (code, title, text, actions, sectionExtra = '') => `<div class="fallback-page"><section class="fallback-card" aria-labelledby="fb-title"${sectionExtra}><span class="fallback-code" aria-hidden="true">${code}</span><h1 id="fb-title">${title}</h1><p>${text}</p><div class="fallback-actions">${actions}</div></section></div>`;
page('sin-acceso', 'Sin acceso', `${publicHeader({ signedIn: true })}${fallback('403', 'Sin acceso', 'No tienes acceso a esta página (es solo para orientadores/as). Tu cuenta es de tipo estudiante.', `${buttonLink('Ir a mi panel', 'vacantes.html', { size: 'lg' })}${button('Cerrar sesión', { variant: 'secondary', size: 'lg' })}`)}`, 'Ruta real: /cuenta/sin-acceso?rol=counselor. Sin sesión: «Ingresa con la cuenta correcta para continuar.» y un solo botón «Ingresar».');
page('404', '404', candidateShell('', fallback('404', 'Esta página no existe', 'Puede que el enlace esté viejo o que lo hayamos movido. Tu avance sigue guardado.', `${buttonLink('Volver al inicio', 'welcome.html', { size: 'lg' })}${buttonLink('Ver vacantes', 'vacantes.html', { variant: 'secondary', size: 'lg' })}`)), 'app/not-found.tsx. Dentro del CandidateShell (la ruta desconocida cuenta como superficie de candidato).');
page('error', 'Error', candidateShell('', fallback('Ups', 'Algo salió mal', 'No fue tu culpa. Intenta de nuevo; si sigue pasando, vuelve al inicio y retoma desde ahí.', `${button('Reintentar', { size: 'lg' })}${buttonLink('Volver al inicio', 'welcome.html', { variant: 'secondary', size: 'lg' })}`, ' role="alert"')) + `<p class="pv-note" style="margin-top:2rem">global-error.tsx (reemplaza el layout raíz, sin shell, botones como enlaces .auth-nav-link)</p>` + fallback('Ups', 'Algo salió mal', 'WorkBridge tuvo un problema al cargar. Tu avance sigue guardado. Intenta de nuevo.', '<button type="button" class="auth-nav-link auth-nav-link-signup">Reintentar</button><a class="auth-nav-link" href="welcome.html">Volver al inicio</a>', ' role="alert"'), 'app/error.tsx (arriba) y app/global-error.tsx (abajo).');

/* ------------------------------------------------------------------ componentes */
{
  const variants = ['primary', 'secondary', 'outline', 'ghost', 'destructive', 'link'];
  const btnRows = variants.map((v) => `<div class="pv-row" style="margin-bottom:1rem"><code style="width:7rem">${v}</code>${['sm', 'md', 'lg'].map((s) => button(`${v} ${s}`, { variant: v, size: s })).join('')}${button(`${v} disabled`, { variant: v, disabled: true })}</div>`).join('');
  const tones = ['neutral', 'success', 'warning', 'danger', 'accent'].map((t) => badge(t, t)).join('');
  const dialog = `<div class="relative ${DIALOG}"><div class="flex flex-col space-y-2 text-center sm:text-left"><h2 class="text-lg font-normal">Guardar esta búsqueda</h2><p class="text-sm text-muted-foreground">Te avisaremos cuando aparezcan vacantes nuevas para lo que buscas.</p></div>${label('d1', 'Nombre de la búsqueda')}${input('d1', { value: 'Atención al cliente en Panamá' })}<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">${button('Cancelar', { variant: 'outline' })}${button('Guardar')}</div>${dlgClose()}</div>`;
  const alertDlg = `<div class="${DIALOG}"><div class="flex flex-col gap-2"><h2 class="text-lg font-normal">¿Eliminar todos tus datos?</h2><p class="text-sm text-muted-foreground">Vamos a borrar tu perfil, tus preferencias y tus búsquedas guardadas. No se puede deshacer.</p></div><div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">${button('Cancelar', { variant: 'outline' })}${button('Sí, eliminar', { variant: 'destructive' })}</div></div>`;
  const toast = (cls, t, d) => `<div class="w-full max-w-sm rounded-md border-[3px] border-ink p-4 font-sans font-bold text-[#111] shadow-[5px_5px_0_var(--shadow-color)] ${cls}"><div class="font-display uppercase tracking-wide">${t}</div><div class="font-medium">${d}</div></div>`;
  const palette = ['yellow', 'pink', 'mint', 'sky', 'teal-brand', 'coral-tint', 'cream', 'night', 'card', 'muted'].map((c) => `<div style="width:6.5rem"><div class="border-[3px] border-ink h-12 rounded-md" style="background:var(--${c})"></div><code style="font-size:.7rem">${c}</code></div>`).join('');
  const stat = Object.keys(ST).map(statusBadge).join('');
  page('componentes', 'Componentes', `<main>
<header class="page-head page-head-yellow"><h1>Componentes</h1><p class="lead">Catálogo de components/ui, clases de globals.css y los stylesheets nuevos (chat, explore, roles, applications, auth). Los toasts de Sonner y los diálogos de Radix están aproximados con el mismo markup/clases.</p></header>
<h2 class="pv-sec">Paleta</h2><div class="pv-row">${palette}</div>
<h2 class="pv-sec">Botones</h2>${btnRows}
<h2 class="pv-sec">Badges</h2><div class="pv-row">${tones}${badge('sticker-tag', 'warning', 'sticker-tag')}</div>
<h2 class="pv-sec">Insignias de estado de postulación</h2><div class="pv-row">${stat}</div>
<h2 class="pv-sec">Chips (explore.css)</h2><div class="pv-row">${xpChip('Presencial')}${xpChip('Nueva', 'mint')}${xpChip('20 h', 'yellow')}${xpChip('Excel', 'plain')}<span class="theme-toggle" style="display:inline-grid">${icon('moon')}</span><span class="role-badge role-badge-counselor">Orientador/a</span><span class="role-badge role-badge-employer">Empresa</span><span class="rl-count">5 pendientes</span></div>
<h2 class="pv-sec">Filtros (roles.css)</h2><div class="rl-toolbar"><ul class="rl-filters">${rlChip('Todas', 5, true)}${rlChip('Brecha crítica', 2, false)}</ul>${rlSort}</div>
<h2 class="pv-sec">Card de vacante y barra de preparación</h2><div style="max-width:24rem">${vacancyCard(VACANCIES[1])}</div>
<h2 class="pv-sec">Inputs</h2><div class="grid gap-4" style="max-width:32rem">
<div class="field">${label('i1', 'Email')}${input('i1', { type: 'email', placeholder: 'tu@correo.com' })}</div>
<div class="field">${label('i2', 'Con valor')}${input('i2', { value: 'Valeria Ríos' })}</div>
<div class="field">${label('i3', 'Deshabilitado')}${input('i3', { value: 'No editable', disabled: true })}</div>
<div class="auth-field"><label for="i6">Con error</label>${input('i6', { value: 'valeria@' }).replace('<input ', '<input aria-invalid="true" ')}<p class="field-error">Escribe un correo válido, por ejemplo ana@correo.com.</p></div>
<div class="field">${label('i4', 'Textarea')}${textarea('i4', { placeholder: 'Escribe aquí…', rows: 3 })}</div>
<div class="field">${label('i5', 'Select')}${selectTrigger('i5', 'Presencial')}</div>
<div class="checkbox-group">${checkLabel(true, 'Marcado')}${checkLabel(false, 'Sin marcar')}</div></div>
<h2 class="pv-sec">Tabs</h2>${tabs(['CV', 'Carta', 'Evidencia'], 1, '<p class="doc-fragment">Contenido de la pestaña activa.</p>')}
<h2 class="pv-sec">Progress</h2><div class="grid gap-3" style="max-width:28rem">${[0, 35, 66, 82, 100].map((v) => `<div><strong>${v}%</strong>${progress(v)}</div>`).join('')}</div>
<h2 class="pv-sec">Card</h2>${card(`${cardHeader(cardTitle('Título de card') + '<p class="text-sm text-muted-foreground">Descripción corta de la tarjeta.</p>')}${cardContent('<p>Contenido de la tarjeta con texto de ejemplo.</p>')}`, '', 'style="max-width:28rem"')}
<h2 class="pv-sec">Dialog (Radix, estático)</h2><div class="pv-stage">${dialog}</div>
<h2 class="pv-sec">AlertDialog (neo-brutal, igual que Dialog)</h2><div class="pv-stage">${alertDlg}</div>
<h2 class="pv-sec">Toasts (Sonner, aproximado)</h2><div class="pv-row">${toast('bg-mint', 'Listo', 'Actualizamos tus vacantes')}${toast('bg-pink', 'Error', 'No pudimos cerrar tu sesión. Intenta de nuevo.')}${toast('bg-yellow', 'Aviso', 'Esa vacante ya no está disponible')}${toast('bg-[#8fb4ff]', 'Info', 'Hay 2 vacantes nuevas')}</div>
<h2 class="pv-sec">Toast de vacantes (.xp-toast, estático)</h2><div class="pv-stage"><div class="xp-toast" style="position:static" role="status">Vacante guardada</div></div>
<h2 class="pv-sec">Banners y estados</h2><div class="grid gap-4" style="max-width:36rem">
<p class="status-banner">status-banner</p><p class="status-banner status-banner-mint">status-banner-mint</p><p class="success">success</p><p class="error">error: algo salió mal, intenta de nuevo.</p><p class="xp-banner">xp-banner · No pudimos actualizar. Te mostramos lo último que guardamos.</p><p class="xp-inline-error">xp-inline-error</p>
<div class="warning-panel"><h4>warning-panel</h4><p>No encontramos una vacante viable.</p></div>
<p class="empty-state">empty-state</p><p class="note-sticker">note-sticker</p><a class="back-link" href="#">Volver</a>
${failureBlock('app-failure', 'No pudimos completar la acción. Intenta de nuevo.', button('Reintentar'))}
<div class="result"><h3>result</h3><ul class="warnings"><li>Aviso uno</li><li>Aviso dos</li></ul></div>
<div class="timeline-demo"><ol class="timeline"><li>Paso uno</li><li>Paso dos</li></ol></div>
<div class="grid gap-2"><p class="eyebrow" style="width:fit-content">eyebrow</p><span class="nav-badge" style="width:fit-content">3</span></div></div>
<h2 class="pv-sec">Page heads</h2><div class="grid gap-8">${['', 'page-head-mint', 'page-head-pink', 'page-head-sky'].map((c) => `<div class="page-head ${c}" style="margin-bottom:0"><h1>${c || 'page-head'}</h1><p class="lead">Título con sticker de esquina.</p></div>`).join('')}</div>
<h2 class="pv-sec">Skeleton</h2>${skeleton('h-24 w-full')}
</main>`, 'components/ui/* + clases de globals.css y de app/styles/*.css.');
}

/* ------------------------------------------------------------------ index */
{
  const sections = GROUPS.map(([g, gl]) => {
    const cards = PAGES.filter((p) => p[3] === g).map(([s, t, r]) => `<a class="g-card" href="${s}.html"><div class="g-thumb"><iframe src="${s}.html?embed=1" title="${t}" loading="lazy" tabindex="-1"></iframe></div><div class="g-meta"><strong>${t}</strong><code>${r}</code></div></a>`).join('');
    return `<section class="g-sec" aria-labelledby="g-${g}"><h2 id="g-${g}" class="g-h">${gl}</h2><div class="g-grid">${cards}</div></section>`;
  }).join('');
  page('index', 'Galería', `<style>
.g-wrap{width:min(100% - 2rem, 80rem);margin:0 auto;padding-block:2rem 4rem}
.g-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(20rem,100%),1fr));gap:1.5rem}
.g-sec{margin-top:2.5rem}
.g-h{margin:0 0 1rem;font-family:var(--font-display);font-size:1.4rem;text-transform:uppercase}
.g-card{display:block;border:3px solid var(--line);border-radius:.5rem;background:var(--card);box-shadow:var(--hard);text-decoration:none;color:var(--foreground);overflow:hidden;transition:transform .12s}
.g-card:hover{transform:translate(-3px,-3px)}
.g-thumb{height:14rem;overflow:hidden;position:relative;border-bottom:3px solid var(--line);background:#fff}
.g-thumb iframe{width:1280px;height:900px;border:0;transform:scale(.3125);transform-origin:0 0;pointer-events:none}
.g-meta{display:flex;justify-content:space-between;gap:.5rem;padding:.75rem 1rem;align-items:center}
.g-meta code{font-size:.75rem;color:var(--ink-muted)}
</style>
<div class="g-wrap"><header class="page-head" style="margin-bottom:0"><p class="eyebrow">Vista previa de diseño</p><h1>WorkBridge: sticker wall</h1><p class="lead">Galería estática de ${PAGES.length} pantallas de apps/web (agrupadas por recorrido) con el CSS real compilado: globals.css + styles/{chat,explore,roles,applications,auth}.css. Usa Modo oscuro y Vista móvil (390px) en la barra superior. Título del documento real: «WorkBridge — Tu experiencia cuenta».</p></header>
${sections}</div>`);
}
console.log('pages written:', PAGES.length + 1, '(incl. index)');
