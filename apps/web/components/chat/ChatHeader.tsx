'use client';

import Link from 'next/link';
import { ArrowLeft, Check } from 'lucide-react';
import { SLOTS, type ChatPhase } from '@/lib/chat/slots';
import type { SlotState } from '@/lib/chat/tracker';
import '@/app/styles/chat.css';

export type StepStatus = 'upcoming' | 'current' | 'complete';

export interface PhaseStep {
  id: 'profile' | 'preferences' | 'done';
  label: string;
  status: StepStatus;
}

const PHASE_LABEL: Record<ChatPhase, string> = {
  profile: 'perfil',
  preferences: 'preferencias',
  done: 'completada',
};

/** Phase-level progress computed from slot states, never from free conversation (screens.md S2). */
export function phaseSteps(phase: ChatPhase, slotState: SlotState): PhaseStep[] {
  const allFilled = (target: 'profile' | 'preferences') =>
    SLOTS.filter((slot) => slot.phase === target).every((slot) => slotState[slot.id]?.state === 'filled');
  const profileDone = phase !== 'profile' || allFilled('profile');
  const prefsDone = phase === 'done';
  return [
    { id: 'profile', label: 'Perfil', status: profileDone ? 'complete' : 'current' },
    { id: 'preferences', label: 'Preferencias', status: prefsDone ? 'complete' : profileDone ? 'current' : 'upcoming' },
    { id: 'done', label: 'Resultados', status: prefsDone ? 'current' : 'upcoming' },
  ];
}

export function ChatHeader({ phase, slotState }: { phase: ChatPhase; slotState: SlotState }) {
  const steps = phaseSteps(phase, slotState);
  const filled = SLOTS.filter((slot) => slotState[slot.id]?.state === 'filled').length;
  return (
    <header className="chat-top">
      <div className="chat-top-row">
        <Link href="/" className="chat-back" aria-label="Volver al inicio"><ArrowLeft aria-hidden="true" /></Link>
        <div className="chat-top-title">
          <p className="chat-top-brand">WorkBridge</p>
          <h1>Conversemos sobre ti</h1>
        </div>
        <p className="chat-top-count" aria-hidden="true">{filled}/{SLOTS.length}</p>
      </div>
      <div className="chat-steps" role="group" aria-label={`Fase ${PHASE_LABEL[phase]}`}>
        <ol>
          {steps.map((step) => (
            <li key={step.id} className={`chat-step is-${step.status}`} aria-current={step.status === 'current' ? 'step' : undefined}>
              <span className="chat-step-bar" aria-hidden="true" />
              <span className="chat-step-label">
                {step.status === 'complete' ? <Check aria-hidden="true" /> : null}
                {step.label}
                {step.status === 'complete' ? <span className="sr-only"> (completado)</span> : null}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </header>
  );
}
