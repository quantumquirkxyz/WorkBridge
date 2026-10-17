'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AttachmentChip } from '@/components/AttachmentChip';
import type { ChatTurn } from '@/lib/chat/schema';
import { SLOTS, type SlotChip, type SlotId } from '@/lib/chat/slots';
import { applyTurn, initialSlotState, pendingSlot, type SlotState, type UserAction } from '@/lib/chat/tracker';
import { validateAttachment } from '@/lib/attachments';
import type { PreferencesDraft } from '@/lib/preferences';
import { saveStoredPreferences } from '@/lib/preferences-storage';
import { Paperclip, SendHorizontal } from 'lucide-react';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { VoiceButton, VoiceStatus } from '@/components/chat/VoiceButton';
import { useVoiceRecorder } from '@/lib/voice-recorder';

interface ChatAttachment {
  file: File;
  kind: 'pdf' | 'image';
}

interface PreparedAttachment extends ChatAttachment {
  progress: number;
  contentBase64: string | null;
}

function skillLabelsFrom(skills: Array<{ canonical_name?: unknown; original_term?: unknown }> | undefined): string[] {
  return (skills ?? [])
    .map((skill) => (typeof skill.original_term === 'string' && skill.original_term.trim()) || (typeof skill.canonical_name === 'string' ? skill.canonical_name : ''))
    .filter((label) => label.length > 0)
    .slice(0, 4);
}

interface ChatMessage {
  id: number;
  role: 'assistant' | 'user';
  content: string;
  chips?: Array<SlotChip & { slot?: SlotId }>;
  skillLabels?: string[];
  attachment?: ChatAttachment;
}

type RenderedChip = SlotChip & { slot?: SlotId };

interface ChatSnapshot {
  transcript?: Array<{ role: 'assistant' | 'user'; content: string }>;
  slotState?: SlotState;
  pendingSlot?: SlotId | null;
  phase?: ChatTurn['phase'];
  sessionVersion?: number;
  version?: number;
}

interface RetryRequest {
  message: string;
  action: UserAction;
}

const WELCOME_MESSAGE = SLOTS[0]!.question;
function resultMessage(name: string | null, skills: number, experiences: number, review: string): string {
  const counts = `Encontré ${skills} ${skills === 1 ? 'habilidad' : 'habilidades'} y ${experiences} ${experiences === 1 ? 'experiencia' : 'experiencias'}`;
  const informal = experiences > 0 ? ', ¡incluida tu experiencia informal! 💪' : '.';
  return `Listo${name ? `, ${name}` : ''}. ${counts}${informal}${review}`;
}

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

function attachmentKind(file: File): ChatAttachment['kind'] | null {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return 'pdf';
  if (file.type.startsWith('image/')) return 'image';
  return null;
}

function attachmentError(file: File, kind: ChatAttachment['kind'] | null): string | null {
  if (!kind) return 'Solo puedo leer PDF o fotos.';
  if (file.size > MAX_ATTACHMENT_BYTES) return 'Ese archivo pesa más de 10 MB. Prueba con otro.';
  const result = validateAttachment(file, kind);
  if (result.ok) return null;
  if (result.error.includes('MB')) return 'Ese archivo pesa más de 10 MB. Prueba con otro.';
  if (result.error.includes('vacío')) return result.error;
  return 'Solo puedo leer PDF o fotos.';
}

function fileToBase64(file: File, onProgress: (percent: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    };
    reader.onload = () => {
      onProgress(100);
      const result = String(reader.result ?? '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('file_read_failed'));
    reader.readAsDataURL(file);
  });
}

export function ChatScreen() {
  const router = useRouter();
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cvRetry = useRef<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageId = useRef(0);
  const profileText = useRef<string[]>([]);
  const intakeStarted = useRef(false);
  const explorationStarted = useRef(false);
  const sessionVersion = useRef(0);
  const activeRequest = useRef(0);
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
  const [pendingAttachment, setPendingAttachment] = useState<PreparedAttachment | null>(null);
  const preloadGeneration = useRef(0);
  const stagedComment = useRef('');
  const voice = useVoiceRecorder({ locale: 'es-PA' });
  const nameRef = useRef<string | null>(null);
  const greetingValue = slotState.greeting.value;
  nameRef.current = typeof greetingValue === 'string' && greetingValue.trim() ? greetingValue.trim() : null;

  const voiceTranscript = voice.transcript;
  useEffect(() => {
    if (voiceTranscript) setDraft(voiceTranscript);
  }, [voiceTranscript]);
  const toggleVoice = useCallback(() => {
    if (voice.listening) voice.stop();
    else void Promise.resolve(voice.start('es-PA')).catch(() => undefined);
  }, [voice]);

  function nextId() {
    messageId.current += 1;
    return messageId.current;
  }

  useEffect(() => {
    let active = true;
    async function loadSession(): Promise<ChatSnapshot | null> {
      let response = await fetch('/api/chat');
      if (response.status === 401) {
        await fetch('/api/auth/sign-in/anonymous', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{}',
        });
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
          // An entirely empty session keeps the greeting's quick reply so a new
          // candidate can start the fallback journey without typing.
          const seededDefinition = seededSlot
            ? SLOTS.find((slot) => slot.id === seededSlot)
            : hasKnownSlots
              ? undefined
              : SLOTS[0];
          const seededChips = seededDefinition?.chips.map((chip) => ({ ...chip, slot: seededDefinition.id }));
          setMessages([{ id: nextId(), role: 'assistant', content: seededDefinition?.question ?? WELCOME_MESSAGE, ...(seededChips?.length ? { chips: seededChips } : {}) }]);
        }
        if (snapshot?.slotState) setSlotState(snapshot.slotState);
        if (snapshot?.phase) setPhase(snapshot.phase);
        if (typeof snapshot?.sessionVersion === 'number') sessionVersion.current = snapshot.sessionVersion;
        else if (typeof snapshot?.version === 'number') sessionVersion.current = snapshot.version;
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

  function addMessage(role: ChatMessage['role'], content: string, chips?: ChatMessage['chips'], skillLabels?: string[], attachment?: ChatAttachment) {
    setMessages((current) => [...current, { id: nextId(), role, content, ...(chips ? { chips } : {}), ...(skillLabels ? { skillLabels } : {}), ...(attachment ? { attachment } : {}) }]);
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
    setActivity('WorkBridge está escribiendo…');
    setRetry(null);
    const thinkingTimer = window.setTimeout(() => setActivity('Estoy pensando…'), 3000);
    const requestId = activeRequest.current + 1;
    activeRequest.current = requestId;
    try {
      let response: Response;
      try {
        response = await fetch('/api/v1/chat/turns', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'Idempotency-Key': crypto.randomUUID(), 'x-request-id': crypto.randomUUID() },
          body: JSON.stringify({ ...request, sessionVersion: sessionVersion.current }),
        });
      } catch {
        // Keep the synchronous adapter usable while deployments roll out the
        // versioned queue endpoints (and for older embedded clients).
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(request),
        });
      }
      if (response.status === 404 || response.status === 500) {
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(request),
        });
      }
      if (!response.ok) {
        const error = await response.json().catch(() => null) as { error?: { retryable?: boolean; message?: string } } | null;
        const retryable = error?.error?.retryable === true;
        if (!retryable) throw new Error(error?.error?.message ?? 'chat_request_failed');
        throw new Error('chat_request_retryable');
      }
      const handle = await response.json() as { jobId?: string; status?: string; statusUrl?: string; pollAfterMs?: number; result?: ChatTurn; reply?: string };
      let turn = handle.result;
      let observedServerVersion = false;
      // The compatibility adapter returns a ChatTurn directly.
      if (handle.reply && !handle.jobId) {
        sessionVersion.current += 1;
        turn = handle as unknown as ChatTurn;
      }
      while (!turn && handle.jobId && activeRequest.current === requestId) {
        setActivity(handle.status === 'running' ? 'Estoy procesando tu respuesta…' : 'Tu respuesta está en cola…');
        await new Promise((resolve) => window.setTimeout(resolve, Math.max(250, handle.pollAfterMs ?? 1000)));
        const statusResponse = await fetch(handle.statusUrl ?? `/api/v1/chat/turns/${encodeURIComponent(handle.jobId)}`, { headers: { 'x-request-id': crypto.randomUUID() } });
        const statusBody = await statusResponse.json() as { status?: string; sessionVersion?: number; version?: number; result?: ChatTurn; error?: { retryable?: boolean; message?: string }; pollAfterMs?: number };
        if (!statusResponse.ok || statusBody.status === 'failed') {
          if (statusBody.error?.retryable) throw new Error('chat_request_retryable');
          throw new Error(statusBody.error?.message ?? 'chat_request_failed');
        }
        if (typeof statusBody.sessionVersion === 'number') { sessionVersion.current = statusBody.sessionVersion; observedServerVersion = true; }
        else if (typeof statusBody.version === 'number') { sessionVersion.current = statusBody.version; observedServerVersion = true; }
        if (statusBody.result) turn = statusBody.result;
        handle.status = statusBody.status;
        handle.pollAfterMs = statusBody.pollAfterMs ?? handle.pollAfterMs;
      }
      if (!turn) throw new Error('chat_request_failed');
      if (!observedServerVersion && typeof (handle as { sessionVersion?: number; version?: number }).sessionVersion !== 'number' && typeof (handle as { sessionVersion?: number; version?: number }).version !== 'number') sessionVersion.current += 1;
      const nextState = applyTurn(slotState, turn.slotUpdates, request.action);
      setSlotState(nextState);
      setPhase(turn.phase);
      const proposalSlot = turn.slotUpdates.find((update) => update.state === 'proposed')?.slot;
      const tagged = turn.chips.map((chip) => ({ ...chip, slot: proposalSlot ?? turn.pendingSlot ?? undefined }));
      const confirmChips = tagged.filter((chip) => chip.kind === 'confirm' || chip.kind === 'change');
      const pendingDefinition = turn.pendingSlot && proposalSlot && proposalSlot !== turn.pendingSlot
        ? SLOTS.find((slot) => slot.id === turn.pendingSlot)
        : undefined;
      const agendaChips = pendingDefinition?.chips.map((chip) => ({ ...chip, slot: turn.pendingSlot ?? undefined })) ?? [];
      const assistantChips = [
        ...(confirmChips.length > 0 ? [] : tagged.filter((chip) => chip.kind !== 'confirm' && chip.kind !== 'change')),
        ...agendaChips,
      ];
      if (confirmChips.length > 0) {
        setMessages((current) => {
          const lastUser = [...current].map((message, index) => ({ message, index })).reverse().find(({ message }) => message.role === 'user')?.index;
          return current.map((message, index) => index === lastUser ? { ...message, chips: confirmChips } : message);
        });
      }
      addMessage('assistant', turn.reply, assistantChips.length > 0 ? assistantChips : undefined);
      const profileComplete = SLOTS.filter((slot) => slot.phase === 'profile').every((slot) => nextState[slot.id].state === 'filled');
      if ((profileComplete || turn.phase === 'preferences' || turn.phase === 'done') && !intakeStarted.current) {
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
    const body = await response.json() as { profile?: { skills?: Array<{ canonical_name?: unknown; original_term?: unknown }>; experiences?: unknown[] }; extraction?: { needs_review?: boolean } };
    const skills = body.profile?.skills?.length ?? 0;
    const experiences = body.profile?.experiences?.length ?? 0;
    const review = body.extraction?.needs_review ? ' Algunos datos los vamos a confirmar contigo en Mi perfil.' : '';
    const skillLabels = skillLabelsFrom(body.profile?.skills);
    setIntakeRetryText(null);
    addMessage('assistant', resultMessage(nameRef.current, skills, experiences, review), undefined, skillLabels);
  }

  function stageAttachment(file: File): void {
    const kind = attachmentKind(file);
    const error = attachmentError(file, kind);
    if (!kind || error) {
      preloadGeneration.current += 1;
      setPendingAttachment(null);
      addMessage('assistant', error ?? 'Solo puedo leer PDF o fotos.');
      return;
    }
    const generation = preloadGeneration.current + 1;
    preloadGeneration.current = generation;
    setPendingAttachment({ file, kind, progress: 0, contentBase64: null });
    void fileToBase64(file, (progress) => {
      if (generation !== preloadGeneration.current) return;
      setPendingAttachment((current) => current && current.file === file ? { ...current, progress } : current);
    }).then((contentBase64) => {
      if (generation !== preloadGeneration.current) return;
      setPendingAttachment({ file, kind, progress: 100, contentBase64 });
    }).catch(() => {
      if (generation !== preloadGeneration.current) return;
      setPendingAttachment(null);
      addMessage('assistant', 'No pude preparar ese archivo. Elige otro PDF o foto.');
    });
  }

  async function uploadCv(file: File, comment = stagedComment.current, contentBase64?: string): Promise<void> {
    const kind = attachmentKind(file);
    const error = attachmentError(file, kind);
    if (!kind || error) {
      setPendingAttachment(null);
      addMessage('assistant', error ?? 'Solo puedo leer PDF o fotos.');
      return;
    }
    const generation = preloadGeneration.current;
    const encoded = contentBase64 ?? pendingAttachment?.contentBase64 ?? await fileToBase64(file, () => undefined);
    const note = comment.trim();
    const label = note || `Subí mi CV: ${file.name}`;
    stagedComment.current = note;
    setLoading(true);
    setActivity('Estoy leyendo tu CV…');
    try {
      const response = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind,
          fileName: file.name,
          mimeType: file.type || (kind === 'pdf' ? 'application/pdf' : 'image/jpeg'),
          contentBase64: encoded,
          ...(note ? { text: note, ...(kind === 'image' ? { altText: note } : {}) } : {}),
        }),
      });
      if (!response.ok) throw new Error('intake_request_failed');
      const body = await response.json() as { profile?: { skills?: Array<{ canonical_name?: unknown; original_term?: unknown }>; experiences?: unknown[] }; extraction?: { needs_review?: boolean } };
      cvRetry.current = null;
      stagedComment.current = '';
      setPendingAttachment(null);
      setDraft('');
      if (phase === 'profile') profileText.current.push(label);
      addMessage('user', label, undefined, undefined, { file, kind });
      const skills = body.profile?.skills?.length ?? 0;
      const experiences = body.profile?.experiences?.length ?? 0;
      const review = body.extraction?.needs_review ? ' Algunos datos los vamos a confirmar contigo en Mi perfil.' : '';
      const skillLabels = skillLabelsFrom(body.profile?.skills);
      addMessage('assistant', resultMessage(nameRef.current, skills, experiences, review), undefined, skillLabels);
      const cvOpen = slotState.cv_source.state !== 'filled';
      await postTurn({
        message: label,
        action: cvOpen ? { kind: 'chip', slot: 'cv_source', value: 'uploaded' } : { kind: 'text' },
      });
    } catch {
      if (generation !== preloadGeneration.current) return;
      cvRetry.current = file;
      setPendingAttachment({ file, kind, progress: 100, contentBase64: encoded });
      addMessage('assistant', 'No pude leer tu CV. Conservé el archivo; puedes intentarlo de nuevo.', [
        { label: 'Reintentar', kind: 'retry' },
      ]);
      setLoading(false);
      setActivity(null);
    }
  }

  async function submitExploration(preferences: PreferencesDraft): Promise<void> {
    const response = await fetch('/api/explore', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(preferences),
    });
    if (!response.ok) throw new Error('explore_request_failed');
    const explored = await response.json() as { candidateId?: string; preferences?: unknown };
    if (explored.candidateId) window.localStorage.setItem('workbridge:candidateId', explored.candidateId);
    if (explored.candidateId) window.localStorage.setItem(`workbridge:exploration:${explored.candidateId}`, JSON.stringify(explored));
    if (explored.candidateId && explored.preferences) saveStoredPreferences(explored.candidateId, explored.preferences);
    setExplorationRetry(null);
    router.push('/vacantes');
  }

  async function send(message: string, action: UserAction, addUserBubble = true): Promise<void> {
    const trimmed = message.trim();
    if (!trimmed || loading) return;
    if (voice.listening) voice.stop();
    if (addUserBubble) {
      addMessage('user', trimmed);
      if (phase === 'profile') profileText.current.push(trimmed);
    }
    setDraft('');
    await postTurn({ message: trimmed, action });
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingAttachment?.contentBase64) {
      void uploadCv(pendingAttachment.file, draft, pendingAttachment.contentBase64);
      return;
    }
    void send(draft, { kind: 'text' });
  }

  function chooseChip(chip: RenderedChip) {
    if (chip.slot === 'cv_source' && chip.label.includes('subo')) {
      fileRef.current?.click();
      return;
    }
    if (chip.kind === 'retry') {
      if (cvRetry.current) {
        const file = cvRetry.current;
        cvRetry.current = null;
        void uploadCv(file, stagedComment.current);
        return;
      }
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
      <ChatHeader phase={phase} slotState={slotState} />
      <section className="chat-transcript" role="log" aria-live="polite" aria-label="Conversación">
        {messages.map((message) => (
          <div key={message.id} className="chat-turn">
            <article className={`chat-bubble chat-bubble-${message.role}`}>
              <p>{message.content}</p>
              {message.skillLabels ? <div className="chat-skill-chips" aria-label="Habilidades encontradas">{message.skillLabels.map((skill) => <span key={skill} className="chat-skill-chip">{skill}</span>)}</div> : null}
              {message.chips ? <div className="chat-chips">{message.chips.map((chip, index) => <button key={`${chip.label}-${index}`} type="button" className="chat-chip" onClick={() => chooseChip(chip)} disabled={loading}>{chip.label}</button>)}</div> : null}
            </article>
            {message.attachment ? <div className={`chat-attachment ${message.role === 'user' ? 'is-user' : ''}`}><AttachmentChip file={message.attachment.file} kind={message.attachment.kind} /></div> : null}
          </div>
        ))}
        {activity ? <p className="chat-activity" role="status"><span className="typing-dots" aria-hidden="true">•••</span> {activity}</p> : null}
        <div ref={messagesEndRef} />
      </section>
      <form className="chat-composer" onSubmit={submit}>
        {pendingAttachment ? (
          <div className="chat-pending">
            <AttachmentChip file={pendingAttachment.file} kind={pendingAttachment.kind} onRemove={() => { preloadGeneration.current += 1; cvRetry.current = null; stagedComment.current = ''; setPendingAttachment(null); }} />
            <div className="chat-preload">
              <div className="chat-preload-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pendingAttachment.progress} aria-label={pendingAttachment.contentBase64 ? 'Archivo listo para enviar' : 'Precargando archivo'}>
                <span style={{ width: `${pendingAttachment.progress}%` }} />
              </div>
              <p>{pendingAttachment.contentBase64 ? 'Listo. Puedes escribir un comentario y pulsar Enviar.' : `Precargando archivo… ${pendingAttachment.progress}%`}</p>
            </div>
          </div>
        ) : null}
        <label className="sr-only" htmlFor="chat-message">Escribe tu respuesta</label>
        <input ref={fileRef} className="sr-only" type="file" accept="application/pdf,image/*" aria-label="Archivo de CV" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) stageAttachment(file); }} />
        {/* One compact bar: attach, input and send share a single bordered surface. */}
        {voice.supported ? <VoiceStatus listening={voice.listening} error={voice.error} /> : null}
        <div className="chat-bar">
          <button type="button" className="chat-attach" aria-label="Adjuntar CV" disabled={loading} onClick={() => fileRef.current?.click()}><Paperclip aria-hidden="true" /></button>
          <textarea className="chat-input" ref={composerRef} id="chat-message" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Escribe tu respuesta…" rows={1} disabled={loading} />
          {voice.supported ? <VoiceButton listening={voice.listening} disabled={loading} onToggle={toggleVoice} /> : null}
          <button type="submit" className="chat-send" aria-label="Enviar" disabled={loading || (pendingAttachment != null && pendingAttachment.contentBase64 == null) || (!draft.trim() && pendingAttachment?.contentBase64 == null)}><SendHorizontal aria-hidden="true" /><span className="chat-send-label">Enviar</span></button>
        </div>
        <p className="chat-composer-hint">Enter envía · Shift+Enter agrega una línea · el archivo se precarga y sale cuando pulsas Enviar</p>
      </form>
    </main>
  );
}
