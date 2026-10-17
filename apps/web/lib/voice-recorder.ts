import { useCallback, useEffect, useRef, useState } from 'react';

/** Microphone permission state observed through the Permissions API when available. */
export type VoicePermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

export interface VoiceRecorderOptions {
  /** Preferred BCP-47 language tag, e.g. `es-PA`. Falls back through `defaultLocales`. */
  locale?: string;
  /** Recognition languages the browser reports as available, used to pick a supported fallback. */
  availableLanguages?: readonly string[];
  /** Stop automatically if no final result arrives within this many ms. Default: 30000. */
  silenceTimeoutMs?: number;
}

export interface VoiceRecorderState {
  /** True when `SpeechRecognition`/`webkitSpeechRecognition` exists in this browser. */
  supported: boolean;
  /** True while recognition is actively listening. */
  listening: boolean;
  /** Current transcript (interim + final). */
  transcript: string;
  /** True when the latest transcript segment is final. */
  final: boolean;
  /** User-facing error message, if any. */
  error: string | null;
  /** Last observed microphone permission state. */
  permission: VoicePermissionState | null;
  /** Language tag actually used by the recognition engine (after fallback). */
  locale: string | null;
}

/** Stable error codes surfaced to the candidate. */
export type VoiceErrorCode =
  | 'unsupported'
  | 'not-allowed'
  | 'service-not-allowed'
  | 'audio-capture'
  | 'no-speech'
  | 'aborted'
  | 'network'
  | 'unknown';

export class VoiceRecorderError extends Error {
  readonly code: VoiceErrorCode;
  constructor(code: VoiceErrorCode, message: string) {
    super(message);
    this.name = 'VoiceRecorderError';
    this.code = code;
  }
}

/** Browser fallback order: candidate's locale, then Panamanian Spanish, then neutral Spanish, then English. */
export const DEFAULT_RECOGNITION_LOCALES = ['es-PA', 'es-419', 'es', 'en-US', 'en'];

type SpeechRecognitionResult = { transcript: string; isFinal: boolean };

type SpeechRecognitionResultList = {
  length: number;
  [index: number]: SpeechRecognitionResult[];
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: ((event: unknown) => void) | null;
};

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const ctor =
    (globalThis as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition ??
    (globalThis as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
  return (ctor as SpeechRecognitionCtor | undefined) ?? null;
}

/** Feature detection: does this browser support the Web Speech API? Testable by mocking `globalThis`. */
export function supportsSpeechRecognition(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

/**
 * Resolve the recognition language with fallback.
 * Order: preferred locale -> es-PA -> es-419 -> es -> en-US -> en.
 * When the browser reports available languages, prefer the first candidate it supports.
 */
export function resolveRecognitionLocale(
  preferred: string | undefined,
  availableLanguages: readonly string[] = [],
): string {
  const candidates = [...(preferred ? [preferred] : []), ...DEFAULT_RECOGNITION_LOCALES];
  for (const lang of candidates) {
    if (!availableLanguages.length || availableLanguages.includes(lang)) {
      return lang;
    }
  }
  const lastDefault = DEFAULT_RECOGNITION_LOCALES[DEFAULT_RECOGNITION_LOCALES.length - 1]!;
  return availableLanguages[0] ?? lastDefault;
}

function mapRecognitionError(event: unknown): { code: VoiceErrorCode; message: string } {
  const error = (event as { error?: string; message?: string }).error ?? 'unknown';
  switch (error) {
    case 'not-allowed':
      return {
        code: 'not-allowed',
        message: 'No se concedió permiso para usar el micrófono. Concedelo en el navegador y vuelve a intentarlo.',
      };
    case 'service-not-allowed':
      return {
        code: 'service-not-allowed',
        message: 'El servicio de reconocimiento de voz no está disponible en este navegador.',
      };
    case 'audio-capture':
      return {
        code: 'audio-capture',
        message: 'No se pudo capturar audio del micrófono. Comprueba que esté conectado y no esté en uso.',
      };
    case 'no-speech':
      return {
        code: 'no-speech',
        message: 'No se detectó voz. Intenta hablar más cerca del micrófono o en un lugar más tranquilo.',
      };
    case 'aborted':
      return { code: 'aborted', message: 'La grabación fue interrumpida.' };
    case 'network':
      return { code: 'network', message: 'Error de red al contactar el servicio de reconocimiento de voz.' };
    default:
      return { code: 'unknown', message: 'Ocurrió un error inesperado con el reconocimiento de voz.' };
  }
}

const DEFAULT_SILENCE_TIMEOUT_MS = 30_000;

/**
 * Manages the lifecycle of a browser `SpeechRecognition` instance.
 * All browser APIs are read through `globalThis`/`navigator` so the class can be
 * exercised in tests without a real browser.
 */
export class VoiceRecorder {
  private readonly options: VoiceRecorderOptions;
  private recognition: SpeechRecognitionLike | null = null;
  private state: VoiceRecorderState;
  private readonly listeners = new Set<(state: VoiceRecorderState) => void>();
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: VoiceRecorderOptions = {}) {
    this.options = {
      silenceTimeoutMs: DEFAULT_SILENCE_TIMEOUT_MS,
      ...options,
    };
    this.state = {
      supported: supportsSpeechRecognition(),
      listening: false,
      transcript: '',
      final: false,
      error: null,
      permission: null,
      locale: null,
    };
  }

  getState(): VoiceRecorderState {
    return this.state;
  }

  subscribe(listener: (state: VoiceRecorderState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private setState(partial: Partial<VoiceRecorderState>): void {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((listener) => listener(this.state));
  }

  private clearSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  private scheduleSilenceTimeout(): void {
    this.clearSilenceTimer();
    this.silenceTimer = setTimeout(() => {
      this.stop();
      this.setState({
        listening: false,
        error: 'No se detectó voz durante un tiempo. Intenta hablar de nuevo.',
      });
    }, this.options.silenceTimeoutMs);
  }

  /** Query microphone permission through the Permissions API when available. */
  async requestPermission(): Promise<VoicePermissionState> {
    if (!this.state.supported) {
      this.setState({ permission: 'unsupported' });
      return 'unsupported';
    }
    const permissions = (globalThis as { navigator?: { permissions?: PermissionLike } }).navigator?.permissions;
    if (!permissions) {
      // No Permissions API: assume the browser will prompt on first start.
      this.setState({ permission: 'prompt' });
      return 'prompt';
    }
    try {
      const result = await permissions.query({ name: 'microphone' });
      const state = (result.state ?? 'prompt') as VoicePermissionState;
      this.setState({ permission: state });
      return state;
    } catch {
      this.setState({ permission: 'prompt' });
      return 'prompt';
    }
  }

  /**
   * Start listening. Resolves once the engine has started successfully.
   * Asynchronous errors (permission denied, no speech, etc.) surface through
   * `state.error` and set `listening` to false.
   */
  async start(locale?: string): Promise<void> {
    if (!this.state.supported) {
      const err = new VoiceRecorderError(
        'unsupported',
        'Tu navegador no soporta el reconocimiento de voz. Pega la transcripción de la nota de voz en su lugar.',
      );
      this.setState({ error: err.message });
      throw err;
    }
    this.stop();
    this.clearSilenceTimer();
    this.setState({ listening: true, error: null, final: false });

    const ctor = getSpeechRecognitionCtor();
    if (!ctor) {
      const err = new VoiceRecorderError('unsupported', 'No se pudo crear el reconocedor de voz.');
      this.setState({ listening: false, error: err.message });
      throw err;
    }

    const recognition = new ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    const resolvedLocale = resolveRecognitionLocale(
      locale ?? this.options.locale,
      this.options.availableLanguages,
    );
    recognition.lang = resolvedLocale;
    this.setState({ locale: resolvedLocale });

    const onResult = (event: unknown) => {
      const results = (event as { results?: unknown }).results;
      if (!results) return;
      let transcript = '';
      let final = false;
      const list = results as unknown as SpeechRecognitionResultList;
      for (let i = 0; i < list.length; i++) {
        const result = list[i];
        if (!result) continue;
        const last = result[result.length - 1];
        if (!last) continue;
        transcript += last.transcript;
        if (last.isFinal) final = true;
      }
      this.clearSilenceTimer();
      this.setState({ transcript, final });
      if (final) this.stop();
    };

    const onError = (event: unknown) => {
      this.clearSilenceTimer();
      const { message } = mapRecognitionError(event);
      this.setState({ listening: false, error: message });
      if (this.recognition === recognition) this.recognition = null;
    };

    const onEnd = () => {
      this.clearSilenceTimer();
      this.setState({ listening: false });
      if (this.recognition === recognition) this.recognition = null;
    };

    recognition.onresult = onResult;
    recognition.onerror = onError;
    recognition.onend = onEnd;
    this.recognition = recognition;

    try {
      recognition.start();
    } catch (error) {
      this.setState({
        listening: false,
        error: error instanceof Error ? error.message : 'No se pudo iniciar la grabación.',
      });
      this.recognition = null;
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /** Stop recognition gracefully. */
  stop(): void {
    this.clearSilenceTimer();
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore; stop may throw if already stopped
      }
      this.recognition = null;
    }
    this.setState({ listening: false });
  }

  /** Cancel recognition immediately and discard interim results. */
  abort(): void {
    this.clearSilenceTimer();
    this.setState({ transcript: '', final: false, error: null, listening: false });
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // ignore
      }
      this.recognition = null;
    }
  }
}

type PermissionLike = {
  query: (permission: { name: string }) => Promise<{ state?: string }>;
};

/**
 * React hook over `VoiceRecorder`. Mirrors the recorder state and exposes
 * `start`, `stop`, `abort`, and `requestPermission`.
 */
export function useVoiceRecorder(options: VoiceRecorderOptions = {}) {
  const [state, setState] = useState<VoiceRecorderState>({
    supported: supportsSpeechRecognition(),
    listening: false,
    transcript: '',
    final: false,
    error: null,
    permission: null,
    locale: null,
  });
  const recorderRef = useRef<VoiceRecorder | null>(null);

  if (!recorderRef.current) {
    recorderRef.current = new VoiceRecorder(options);
  }

  const updateState = useCallback((next: VoiceRecorderState) => setState(next), []);

  useEffect(() => {
    const recorder = recorderRef.current!;
    const unsubscribe = recorder.subscribe(updateState);
    return unsubscribe;
  }, [updateState]);

  const start = useCallback(
    (locale?: string) => recorderRef.current!.start(locale),
    [],
  );
  const stop = useCallback(() => recorderRef.current!.stop(), []);
  const abort = useCallback(() => recorderRef.current!.abort(), []);
  const requestPermission = useCallback(() => recorderRef.current!.requestPermission(), []);

  return {
    ...state,
    start,
    stop,
    abort,
    requestPermission,
    recorder: recorderRef.current,
  };
}
