import { SKIP_DEFAULTS, SLOTS, slotDefinition, type SlotId } from './slots';
import type { SlotState } from './tracker';

const ZONE_DEFAULT = 'Panamá (ciudad)';

/** Phrases the model uses when it closes before the agenda is finished. */
const FAREWELL =
  /éxito en tu búsqueda|toda la información|búsqueda laboral|no dudes en|hasta luego|adi[oó]s|gracias por compartir|si necesitas m[aá]s ayuda|aqu[ií] estoy para ayudarte/i;

export function isFarewell(reply: string): boolean {
  return FAREWELL.test(reply);
}

function questionAnchor(question: string): string {
  const mark = question.lastIndexOf('¿');
  return (mark >= 0 ? question.slice(mark) : question).toLowerCase();
}

/**
 * A farewell ends the interview. Proposed answers are kept, unanswered
 * preferences take the skip defaults, and every remaining slot is filled so
 * the chat can move on to vacancies.
 */
export function closeAgenda(state: SlotState): SlotState {
  const next: SlotState = { ...state };
  for (const slot of SLOTS) {
    const entry = next[slot.id];
    if (entry.state === 'filled') continue;
    if (entry.value !== undefined && entry.state === 'proposed') {
      next[slot.id] = { state: 'filled', value: entry.value };
      continue;
    }
    if (slot.phase === 'preferences') {
      const value = slot.id === 'zone' ? ZONE_DEFAULT : SKIP_DEFAULTS[slot.id];
      next[slot.id] = { state: 'filled', ...(value !== undefined ? { value } : {}) };
      continue;
    }
    next[slot.id] = entry.value !== undefined ? { state: 'filled', value: entry.value } : { state: 'filled' };
  }
  return next;
}

/**
 * While a slot is still pending, the reply must ask that question. A farewell
 * is left untouched: the handler closes the agenda instead of re-asking.
 */
export function keepAgendaOpen(reply: string, pending: SlotId | null): string {
  if (!pending) return reply.trim();
  const question = slotDefinition(pending).question;
  const anchor = questionAnchor(question);
  const stripped = reply
    .replace(/[^.!?\n]*?(?:éxito en tu búsqueda|toda la información|búsqueda laboral|no dudes en|hasta luego|adiós|adios|gracias por compartir|si necesitas más ayuda|si necesitas mas ayuda|aqu[ií] estoy para ayudarte)[^.!?\n]*[.!?]?/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const base = stripped.toLowerCase().includes(anchor) ? stripped : `${stripped} ${question}`.trim();
  if (base.length <= 600) return base;
  const room = 600 - question.length - 1;
  if (room < 1) return question.slice(0, 600);
  return `${base.slice(0, room).trim()} ${question}`.slice(0, 600);
}

interface ProfileExperience {
  title?: string;
  description?: string;
  organization?: string;
  ongoing?: boolean;
  started_at?: string;
  ended_at?: string;
}

interface ProfileEducation {
  program?: string;
  level?: string;
  institution?: string;
}

function durationLabel(experience: ProfileExperience): string | undefined {
  if (experience.ongoing) return 'Todavía lo hago';
  const start = Date.parse(experience.started_at ?? '');
  const end = Date.parse(experience.ended_at ?? '');
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return undefined;
  const months = (end - start) / (1000 * 60 * 60 * 24 * 30);
  if (months < 3) return 'Menos de 3 meses';
  if (months < 12) return '3 a 12 meses';
  return 'Más de un año';
}

/**
 * A CV already stored on the profile answers some profile slots. Only `missing`
 * slots are filled, so an answer the person is confirming is left alone.
 */
export function coverKnownProfileSlots(state: SlotState, profile: unknown): SlotState {
  if (!profile || typeof profile !== 'object') return state;
  const record = profile as {
    sources?: Array<{ kind?: string }>;
    experiences?: ProfileExperience[];
    education?: ProfileEducation[];
    target_roles?: unknown[];
  };
  if (!record.sources?.some((source) => source.kind === 'pdf' || source.kind === 'image')) return state;
  const next: SlotState = { ...state };
  const fill = (slot: SlotId, value: unknown) => {
    if (typeof value !== 'string' || !value.trim() || next[slot].state !== 'missing') return;
    next[slot] = { state: 'filled', value: value.trim().slice(0, 100) };
  };
  fill('cv_source', 'uploaded');
  const experience = record.experiences?.find((item) => item && (item.title || item.description || item.organization));
  if (experience) {
    const place = [experience.title, experience.organization].filter((part) => part?.trim()).join(' en ');
    fill('experiences', place || 'Experiencia del CV');
    if (experience.description?.trim()) fill('experience_tasks', experience.description);
    const duration = durationLabel(experience);
    if (duration) fill('experience_duration', duration);
  }
  const study = record.education?.find((item) => item && (item.program || item.level || item.institution));
  if (study) fill('education', [study.program, study.institution].filter(Boolean).join(' en ') || study.level);
  const role = record.target_roles?.find((item) => typeof item === 'string' && item.trim());
  if (typeof role === 'string') fill('target_roles', role);
  return next;
}
