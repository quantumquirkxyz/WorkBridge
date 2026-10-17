'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { ChatTurn } from '@/lib/chat/schema';
import { SLOTS, type SlotChip, type SlotId } from '@/lib/chat/slots';
import { applyTurn, initialSlotState, pendingSlot, type SlotState, type UserAction } from '@/lib/chat/tracker';
import type { PreferencesDraft } from '@/lib/preferences';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';

interface ChatMessage {
  id: number;
  role: 'assistant' | 'user';
  content: string;
  chips?: Array<SlotChip & { slot?: SlotId }>;
  skillLabels?: string[];
}

type RenderedChip = SlotChip & { slot?: SlotId };

interface ChatSnapshot {
  transcript?: Array<{ role: 'assistant' | 'user'; content: string }>;
  slotState?: SlotState;
  pendingSlot?: SlotId | null;
  phase?: ChatTurn['phase'];
}

interface RetryRequest {
  message: string;
  action: UserAction;
}

const WELCOME_MESSAGE = SLOTS[0]!.question;

export function ChatScreen() {
  const router = useRouter();
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageId = useRef(0);
  const profileText = useRef<string[]>([]);
  const intakeStarted = useRef(false);
  const explorationStarted = useRef(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [slotState, setSlotState] = useState<SlotState>(initialSlotState);
  const [phase, setPhase] = useState<ChatTurn['phase']>('profile');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [activity, setActivity] = useState<string | null>(null);
  const [retry, setRetry] = useState<RetryRequest | null>(null);
  const [intakeRetryText, setIntakeRetryText] = useState<string | null>(null);
  const [intakeExplorationRetry, setIntakeExplorationRetry] = useState<PreferencesDraft | null>(null);
  const [explorationRetry, setExplorationRetry] = useState<PreferencesDraft | null>(null);

  function nextId() {
    messageId.current += 1;
    return messageId.current;
  }

  useEffect(() => {
    let active = true;
    async function loadSession(): Promise<ChatSnapshot | null> {
      let response = await fetch('/api/chat');
      if (response.status === 401) {
        await fetch('/api/auth/sign-in/anonymous', { method: 'POST', headers: { 'content-type': 'application/json' } });
        response = await fetch('/api/chat');
      }
      return response.ok ? await response.json() as ChatSnapshot : null;
    }
    void loadSession()
      .then((snapshot) => {
        if (!active) return;
        const restored = snapshot?.transcript ?? [];
        if (restored.length > 0) {
          const restoredState = snapshot?.slotState;
          const proposedSlot = restoredState
            ? (Object.entries(restoredState).find(([, entry]) => entry.state === 'proposed')?.[0] as SlotId | undefined)
            : undefined;
          const answerSlot = proposedSlot ?? snapshot?.pendingSlot ?? (restoredState ? pendingSlot(restoredState) : null);
          const answerDefinition = answerSlot ? SLOTS.find((slot) => slot.id === answerSlot) : undefined;
          const restoredChips = proposedSlot
            ? [{ label: 'Sí', kind: 'confirm' as const, slot: proposedSlot }, { label: 'Cambiar', kind: 'change' as const, slot: proposedSlot }]
            : answerDefinition?.chips.map((chip) => ({ ...chip, slot: answerSlot ?? undefined }));
          const chipMessageIndex = [...restored].map((message, index) => ({ message, index })).reverse()
            .find(({ message }) => message.role === (proposedSlot ? 'user' : 'assistant'))?.index;
          setMessages(restored.map((message, index) => ({
            ...message,
            id: nextId(),
            ...(index === chipMessageIndex && restoredChips?.length ? { chips: restoredChips } : {}),
          })));
          profileText.current = restored.filter((message) => message.role === 'user').map((message) => message.content);
        } else {
          const seededState = snapshot?.slotState;
          const hasKnownSlots = seededState && Object.values(seededState).some((entry) => entry.state === 'filled' || entry.state === 'proposed');
          const seededSlot = hasKnownSlots ? snapshot?.pendingSlot ?? pendingSlot(seededState) : null;
          const seededDefinition = seededSlot ? SLOTS.find((slot) => slot.id === seededSlot) : undefined;
          const seededChips = seededDefinition?.chips.map((chip) => ({ ...chip, slot: seededSlot ?? undefined }));
          setMessages([{ id: nextId(), role: 'assistant', content: seededDefinition?.question ?? WELCOME_MESSAGE, ...(seededChips?.length ? { chips: seededChips } : {}) }]);
        }
        if (snapshot?.slotState) setSlotState(snapshot.slotState);
        if (snapshot?.phase) setPhase(snapshot.phase);
      })
      .catch(() => {
        if (active) setMessages([{ id: nextId(), role: 'assistant', content: WELCOME_MESSAGE }]);
      });
    composerRef.current?.focus();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [messages, activity]);

  function addMessage(role: ChatMessage['role'], content: string, chips?: ChatMessage['chips'], skillLabels?: string[]) {
    setMessages((current) => [...current, { id: nextId(), role, content, ...(chips ? { chips } : {}), ...(skillLabels ? { skillLabels } : {}) }]);
  }

  function preferencesFromState(state: SlotState): PreferencesDraft {
    const zone = typeof state.zone.value === 'string' ? state.zone.value : 'Panamá (ciudad)';
    const location = zone.includes('Oeste')
      ? { country: 'PA', province: 'Panamá Oeste', district: null, raw: zone }
      : zone.includes('San Miguelito')
        ? { country: 'PA', province: 'Panamá', district: 'San Miguelito', raw: zone }
        : { country: 'PA', province: 'Panamá', district: 'Panamá', raw: zone };
    const schedule = state.schedule.value && typeof state.schedule.value === 'object'
      ? state.schedule.value as { days?: number[]; from?: string; to?: string; weekly_hours?: number; contract_type?: string }
      : { days: [1, 2, 3, 4, 5], from: '08:00', to: '17:00', weekly_hours: 40, contract_type: 'full_time' };
    const minute = (value: string | undefined, fallback: number) => {
      const parts = (value ?? '').split(':').map(Number);
      const hours = parts[0];
      const minutes = parts[1];
      return hours !== undefined && minutes !== undefined && Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : fallback;
    };
    const role = typeof state.target_roles.value === 'string' && state.target_roles.value.trim()
      ? state.target_roles.value
      : 'Atención al cliente';
    return {
      locale: 'es-PA',
      target_roles: [role],
      modality: state.modality.value === 'remote' || state.modality.value === 'hybrid' ? state.modality.value : 'onsite',
      max_location: location,
      max_travel_minutes: 60,
      monthly_transport_budget_usd: 40,
      minimum_salary_usd: typeof state.minimum_salary_usd.value === 'number' ? state.minimum_salary_usd.value : 600,
      availability: {
        days: schedule.days ?? [1, 2, 3, 4, 5],
        start_minute: minute(schedule.from, 480),
        end_minute: minute(schedule.to, 1020),
        weekly_hours: schedule.weekly_hours ?? 40,
      },
      contract_types: [schedule.contract_type === 'part_time' ? 'part_time' : 'full_time'],
      transport_modes: ['transit'],
      willing_to_train: state.willing_to_train.value !== false,
      willing_to_intern: false,
    };
  }

  async function postTurn(request: RetryRequest): Promise<void> {
    setLoading(true);
    setActivity('Puente está escribiendo…');
    setRetry(null);
    const thinkingTimer = window.setTimeout(() => setActivity('Estoy pensando…'), 3000);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (!response.ok) throw new Error('chat_request_failed');
      const turn = await response.json() as ChatTurn;
      const nextState = applyTurn(slotState, turn.slotUpdates, request.action);
      setSlotState(nextState);
      setPhase(turn.phase);
      const proposalSlot = turn.slotUpdates.find((update) => update.state === 'proposed')?.slot;
      const chips = turn.chips.map((chip) => ({ ...chip, slot: proposalSlot ?? turn.pendingSlot ?? undefined }));
      if (proposalSlot && chips.length > 0) {
        setMessages((current) => {
          const lastUser = [...current].map((message, index) => ({ message, index })).reverse().find(({ message }) => message.role === 'user')?.index;
          return current.map((message, index) => index === lastUser ? { ...message, chips } : message);
        });
        addMessage('assistant', turn.reply);
      } else {
        addMessage('assistant', turn.reply, chips.length > 0 ? chips : undefined);
      }
      const profileComplete = SLOTS.filter((slot) => slot.phase === 'profile').every((slot) => nextState[slot.id].state === 'filled');
      if ((profileComplete || turn.phase === 'preferences') && !intakeStarted.current) {
        intakeStarted.current = true;
        const text = profileText.current.join('\n');
        try {
          await submitIntake(text);
        } catch {
          setIntakeRetryText(text);
          if (turn.phase === 'done') setIntakeExplorationRetry(preferencesFromState(nextState));
          addMessage('assistant', 'No pude leer lo que me contaste. Conservé nuestra conversación; puedes intentarlo de nuevo.', [
            { label: 'Reintentar', kind: 'retry' },
          ]);
          return;
        }
      }
      if (turn.phase === 'done' && !explorationStarted.current) {
        explorationStarted.current = true;
        const preferences = preferencesFromState(nextState);
        try {
          await submitExploration(preferences);
        } catch {
          explorationStarted.current = false;
          setExplorationRetry(preferences);
          addMessage('assistant', 'No pude buscar vacantes ahora. Conservé tus respuestas; puedes intentarlo de nuevo.', [
            { label: 'Reintentar', kind: 'retry' },
          ]);
        }
      }
    } catch {
      addMessage('assistant', 'No pude continuar ahora. Conservé nuestra conversación; puedes intentarlo de nuevo.', [
        { label: 'Reintentar', kind: 'retry', slot: request.action.kind === 'text' ? undefined : request.action.slot },
      ]);
      setRetry(request);
    } finally {
      window.clearTimeout(thinkingTimer);
      setLoading(false);
      setActivity(null);
      window.requestAnimationFrame(() => composerRef.current?.focus());
    }
  }

  async function submitIntake(text: string): Promise<void> {
    setActivity('Estoy leyendo lo que me contaste…');
    const response = await fetch('/api/intake', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'text', text: text || 'Experiencia declarada en conversación.' }),
    });
    if (!response.ok) throw new Error('intake_request_failed');
    const body = await response.json() as { profile?: { skills?: Array<{ canonical_name?: unknown }>; experiences?: unknown[] }; extraction?: { needs_review?: boolean } };
    const skills = body.profile?.skills?.length ?? 0;
    const experiences = body.profile?.experiences?.length ?? 0;
    const review = body.extraction?.needs_review ? ' Algunos datos los vamos a confirmar contigo en Mi perfil.' : '';
    const skillLabels = (body.profile?.skills ?? [])
      .map((skill) => typeof skill.canonical_name === 'string' ? skill.canonical_name : '')
      .filter((label): label is string => label.length > 0)
      .slice(0, 4);
    setIntakeRetryText(null);
    addMessage('assistant', `Encontré ${skills} ${skills === 1 ? 'habilidad' : 'habilidades'} y ${experiences} ${experiences === 1 ? 'experiencia' : 'experiencias'}.${review}`, undefined, skillLabels);
  }

  async function submitExploration(preferences: PreferencesDraft): Promise<void> {
    const response = await fetch('/api/explore', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(preferences),
    });
    if (!response.ok) throw new Error('explore_request_failed');
    const explored = await response.json() as { preferences?: unknown };
    window.localStorage.setItem('puente:exploration', JSON.stringify(explored));
    if (explored.preferences) window.localStorage.setItem('puente:preferences', JSON.stringify(explored.preferences));
    setExplorationRetry(null);
    router.push('/vacantes');
  }

  async function send(message: string, action: UserAction, addUserBubble = true): Promise<void> {
    const trimmed = message.trim();
    if (!trimmed || loading) return;
    if (addUserBubble) {
      addMessage('user', trimmed);
      if (phase === 'profile') profileText.current.push(trimmed);
    }
    setDraft('');
    await postTurn({ message: trimmed, action });
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(draft, { kind: 'text' });
  }

  function chooseChip(chip: RenderedChip) {
    if (chip.kind === 'retry') {
      if (explorationRetry) {
        const preferences = explorationRetry;
        setLoading(true);
        setActivity('Estoy buscando vacantes…');
        void submitExploration(preferences).catch(() => {
          explorationStarted.current = false;
          setExplorationRetry(preferences);
          addMessage('assistant', 'No pude buscar vacantes todavía. Puedes intentarlo de nuevo.', [{ label: 'Reintentar', kind: 'retry' }]);
        }).finally(() => {
          setLoading(false);
          setActivity(null);
          window.requestAnimationFrame(() => composerRef.current?.focus());
        });
      } else if (intakeRetryText) {
        setLoading(true);
        setActivity('Estoy leyendo lo que me contaste…');
        const pendingExploration = intakeExplorationRetry;
        void submitIntake(intakeRetryText).then(async () => {
          if (!pendingExploration) return;
          setIntakeExplorationRetry(null);
          explorationStarted.current = true;
          try {
            await submitExploration(pendingExploration);
          } catch {
            explorationStarted.current = false;
            setExplorationRetry(pendingExploration);
            addMessage('assistant', 'No pude buscar vacantes todavía. Puedes intentarlo de nuevo.', [{ label: 'Reintentar', kind: 'retry' }]);
          }
        }).catch(() => {
          addMessage('assistant', 'No pude leerlo todavía. Puedes intentarlo de nuevo.', [{ label: 'Reintentar', kind: 'retry' }]);
        }).finally(() => {
          setLoading(false);
          setActivity(null);
          window.requestAnimationFrame(() => composerRef.current?.focus());
        });
      } else if (retry) void postTurn(retry);
      return;
    }
    if (!chip.slot) return;
    const action: UserAction = chip.kind === 'confirm'
      ? { kind: 'confirm', slot: chip.slot }
      : chip.kind === 'change'
        ? { kind: 'change', slot: chip.slot }
        : { kind: 'chip', slot: chip.slot, value: chip.value };
    void send(chip.label, action);
  }

  return (
    <main className="chat-page">
      <header className="chat-header">
        <p className="eyebrow">Puente Laboral</p>
        <h1>Conversemos sobre ti</h1>
        <p className="lead">No hay respuestas correctas o incorrectas. Puedes escribir o elegir una opción.</p>
        <div className="chat-progress" aria-label={`Fase ${phase === 'profile' ? 'perfil' : phase === 'preferences' ? 'preferencias' : 'completada'}`}>
          {(['profile', 'preferences', 'done'] as const).map((item) => <span key={item} className={phase === item ? 'is-current' : phase === 'done' || (item === 'profile' && phase === 'preferences') ? 'is-complete' : ''} />)}
        </div>
      </header>
      <section className="chat-transcript" role="log" aria-live="polite" aria-label="Conversación">
        {messages.map((message) => (
          <article key={message.id} className={`chat-bubble chat-bubble-${message.role}`}>
            <p>{message.content}</p>
            {message.skillLabels ? <div className="chat-skill-chips" aria-label="Habilidades encontradas">{message.skillLabels.map((skill) => <span key={skill} className="chat-skill-chip">{skill}</span>)}</div> : null}
            {message.chips ? <div className="chat-chips">{message.chips.map((chip, index) => <button key={`${chip.label}-${index}`} type="button" className="chat-chip" onClick={() => chooseChip(chip)} disabled={loading}>{chip.label}</button>)}</div> : null}
          </article>
        ))}
        {activity ? <p className="chat-activity" role="status"><span className="typing-dots" aria-hidden="true">•••</span> {activity}</p> : null}
        <div ref={messagesEndRef} />
      </section>
      <form className="chat-composer" onSubmit={submit}>
        <label className="sr-only" htmlFor="chat-message">Escribe tu respuesta</label>
        <Textarea ref={composerRef} id="chat-message" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Escribe tu respuesta…" rows={2} disabled={loading} />
        <Button type="submit" size="md" disabled={loading || !draft.trim()}>Enviar</Button>
        <p className="chat-composer-hint">Enter envía · Shift+Enter agrega una línea</p>
      </form>
    </main>
  );
}
