'use client';

import * as React from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useVoiceRecorder, type VoiceRecorderOptions } from '@/lib/voice-recorder';

interface VoiceRecorderProps {
  /** BCP-47 preferred language, e.g. `es-PA`. Falls back when unsupported by the engine. */
  locale?: string;
  /** Languages the recognition engine reports as available. */
  availableLanguages?: readonly string[];
  /** Called whenever the transcript changes. `final` is true for a completed segment. */
  onTranscript?: (transcript: string, final: boolean) => void;
  /** Whether the microphone permission should be requested on mount. */
  autoRequestPermission?: boolean;
}

export function VoiceRecorder({
  locale,
  availableLanguages,
  onTranscript,
  autoRequestPermission = false,
}: VoiceRecorderProps) {
  const options: VoiceRecorderOptions = React.useMemo(
    () => ({ locale, availableLanguages }),
    [locale, availableLanguages],
  );
  const {
    supported,
    listening,
    transcript,
    final,
    error,
    permission,
    start,
    stop,
    abort,
    requestPermission,
  } = useVoiceRecorder(options);

  React.useEffect(() => {
    if (autoRequestPermission && supported && permission === null) {
      requestPermission();
    }
  }, []);

  React.useEffect(() => {
    if (transcript && onTranscript) {
      onTranscript(transcript, final);
    }
  }, [transcript, final, onTranscript]);

  if (!supported) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-input bg-muted p-3 text-sm">
        <span role="img" aria-label="info">
          ℹ️
        </span>
        <p className="text-foreground">
          Tu navegador no soporta el reconocimiento de voz.{' '}
          <span className="font-medium">Pega la transcripción de tu nota de voz</span>
          en el campo de texto de arriba.
        </p>
      </div>
    );
  }

  const permissionDenied = permission === 'denied';

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-input bg-card p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Nota de voz</span>
        <Badge
          tone={listening ? 'success' : permissionDenied ? 'danger' : 'neutral'}
          className="shrink-0"
        >
          {listening
            ? 'Escuchando…'
            : permissionDenied
              ? 'Micrófono bloqueado'
              : permission === 'granted'
                ? 'Listo'
                : 'Sin micrófono'}
        </Badge>
      </div>

      {permissionDenied && (
        <p className="text-sm text-danger">
          No se concedió permiso para usar el micrófono. Concedelo en el navegador
          y presiona "Grabar" de nuevo.
        </p>
      )}

      <div className="flex items-center gap-2">
        {permissionDenied ? (
          <Button variant="outline" size="sm" onClick={requestPermission} disabled={listening}>
            Reintentar permiso
          </Button>
        ) : listening ? (
          <Button variant="destructive" size="sm" onClick={stop} disabled={false}>
            Detener
          </Button>
        ) : (
          <Button size="sm" onClick={async () => {
            try {
              await start(locale);
            } catch {
              // start() already surfaces the error in state.
            }
          }}>
            Grabar
          </Button>
        )}
        {listening && (
          <Button variant="outline" size="sm" onClick={abort}>
            Cancelar
          </Button>
        )}
      </div>

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      {transcript.length > 0 && (
        <div className="rounded-xl border border-input bg-muted p-2 text-sm max-h-40 overflow-y-auto">
          {transcript}
          {!final && <span className="animate-pulse text-muted-foreground"> …</span>}
        </div>
      )}

      {!listening && transcript.length === 0 && !error && !permissionDenied && (
        <p className="text-xs text-muted-foreground">
          Presiona Grabar y habla; la transcripción aparece aquí y se usa para analizar tu perfil.
        </p>
      )}
    </div>
  );
}

VoiceRecorder.displayName = 'VoiceRecorder';
