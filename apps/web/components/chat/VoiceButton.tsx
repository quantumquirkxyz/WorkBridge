'use client';

import { Mic, Square } from 'lucide-react';

interface VoiceButtonProps {
  listening: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

/** Presentational mic button for the chat bar (state comes from useVoiceRecorder in ChatScreen). */
export function VoiceButton({ listening, disabled, onToggle }: VoiceButtonProps) {
  return (
    <button
      type="button"
      className={`chat-voice${listening ? ' is-listening' : ''}`}
      aria-label={listening ? 'Detener grabación' : 'Hablar'}
      aria-pressed={listening}
      disabled={disabled}
      onClick={onToggle}
    >
      {listening ? <Square aria-hidden="true" /> : <Mic aria-hidden="true" />}
    </button>
  );
}

/** Banner and error shown above the chat bar while recording. */
export function VoiceStatus({ listening, error }: { listening: boolean; error: string | null }) {
  return (
    <div role="status">
      {listening ? <p className="chat-voice-banner">Te escucho… toca para terminar</p> : null}
      {error ? <p className="chat-voice-error">{error}</p> : null}
    </div>
  );
}
