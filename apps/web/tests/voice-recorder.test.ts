import { afterEach, describe, expect, it } from 'vitest';
import {
  supportsSpeechRecognition,
  resolveRecognitionLocale,
  DEFAULT_RECOGNITION_LOCALES,
  VoiceRecorder,
  type VoicePermissionState,
} from '../lib/voice-recorder';

const originalSpeechRecognition = (globalThis as { SpeechRecognition?: unknown }).SpeechRecognition;
const originalWebkitSpeechRecognition = (globalThis as {
  webkitSpeechRecognition?: unknown;
}).webkitSpeechRecognition;
const originalNavigator = (globalThis as { navigator?: unknown }).navigator;

function setNavigator(value: unknown) { Object.defineProperty(globalThis, "navigator", { configurable: true, value }); }

let lastInstance: FakeSpeechRecognition | null = null;

afterEach(() => {
  (globalThis as { SpeechRecognition?: unknown }).SpeechRecognition = originalSpeechRecognition;
  (globalThis as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition = originalWebkitSpeechRecognition;
  setNavigator(originalNavigator);
  FakeSpeechRecognition.instances = [];
  lastInstance = null;
});

class FakeSpeechRecognition {
  static instances: FakeSpeechRecognition[] = [];
  continuous = false;
  interimResults = false;
  lang = '';
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onend: ((event: unknown) => void) | null = null;
  startCalls = 0;
  constructor() {
    FakeSpeechRecognition.instances.push(this);
  }
  start() {
    this.startCalls++;
  }
  stop() {}
  abort() {}
}

function installFakeEngine() {
  (globalThis as { SpeechRecognition?: unknown }).SpeechRecognition = FakeSpeechRecognition;
}

function uninstallEngine() {
  (globalThis as { SpeechRecognition?: unknown }).SpeechRecognition = undefined;
  (globalThis as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition = undefined;
}

function engine(): FakeSpeechRecognition {
  const instance = lastInstance ?? FakeSpeechRecognition.instances[FakeSpeechRecognition.instances.length - 1];
  if (!instance) throw new Error('no SpeechRecognition instance was created');
  return instance;
}

function finalResultEvent(transcript: string) {
  return { results: [ [ { transcript, isFinal: true } ] ] };
}

function interimResultEvent(transcript: string) {
  return { results: [ [ { transcript, isFinal: false } ] ] };
}

describe('supportsSpeechRecognition', () => {
  it('is false when neither SpeechRecognition nor webkitSpeechRecognition exists', () => {
    uninstallEngine();
    expect(supportsSpeechRecognition()).toBe(false);
  });

  it('is true when SpeechRecognition exists', () => {
    installFakeEngine();
    expect(supportsSpeechRecognition()).toBe(true);
  });

  it('is true when only webkitSpeechRecognition exists', () => {
    uninstallEngine();
    (globalThis as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition = FakeSpeechRecognition;
    expect(supportsSpeechRecognition()).toBe(true);
  });
});

describe('resolveRecognitionLocale', () => {
  it('uses the preferred locale', () => {
    expect(resolveRecognitionLocale('es-PA')).toBe('es-PA');
  });

  it('defaults to Panamanian Spanish when no preferred locale', () => {
    expect(resolveRecognitionLocale(undefined)).toBe('es-PA');
    expect(DEFAULT_RECOGNITION_LOCALES[0]).toBe('es-PA');
  });

  it('falls back through the chain when the preferred locale is unsupported', () => {
    expect(resolveRecognitionLocale('es-PA', ['es-419', 'en-US'])).toBe('es-419');
  });

  it('falls back to English when earlier candidates are unsupported', () => {
    expect(resolveRecognitionLocale('es-PA', ['en-US'])).toBe('en-US');
  });

  it('uses an available language when no default matches', () => {
    expect(resolveRecognitionLocale('fr-FR', ['fr-FR'])).toBe('fr-FR');
  });

  it('uses the preferred locale when no available languages are reported', () => {
    expect(resolveRecognitionLocale('fr-FR', [])).toBe('fr-FR');
    expect(resolveRecognitionLocale(undefined, [])).toBe('es-PA');
  });
});

describe('VoiceRecorder (unsupported engine)', () => {
  it('reports unsupported and rejects start()', async () => {
    uninstallEngine();
    expect(supportsSpeechRecognition()).toBe(false);
    const recorder = new VoiceRecorder();
    expect(recorder.getState().supported).toBe(false);

    await expect(recorder.start()).rejects.toThrow(/no soporta/);
    expect(recorder.getState().error).toContain('no soporta');
    expect(recorder.getState().listening).toBe(false);

    const permission: VoicePermissionState = await recorder.requestPermission();
    expect(permission).toBe('unsupported');
    expect(recorder.getState().permission).toBe('unsupported');
  });
});

describe('VoiceRecorder (fake engine)', () => {
  it('starts listening, resolves the locale, and records a final transcript', async () => {
    installFakeEngine();
    const recorder = new VoiceRecorder({ silenceTimeoutMs: 50 });
    const started = recorder.start('es-PA');

    expect(engine().startCalls).toBe(1);
    expect(recorder.getState().listening).toBe(true);
    expect(recorder.getState().locale).toBe('es-PA');
    expect(recorder.getState().error).toBeNull();

    await started;

    engine().onresult!(finalResultEvent('Trabajé en una tienda de abarrotes'));
    expect(recorder.getState().transcript).toBe('Trabajé en una tienda de abarrotes');
    expect(recorder.getState().final).toBe(true);
    expect(recorder.getState().listening).toBe(false);
  });

  it('records an interim transcript without marking it final', async () => {
    installFakeEngine();
    const recorder = new VoiceRecorder();
    await recorder.start();

    engine().onresult!(interimResultEvent('Ayudaba en'));
    expect(recorder.getState().transcript).toBe('Ayudaba en');
    expect(recorder.getState().final).toBe(false);
    expect(recorder.getState().listening).toBe(true);
  });

  it('maps a not-allowed recognition error to a user-facing message and stops', async () => {
    installFakeEngine();
    const recorder = new VoiceRecorder();
    const started = recorder.start();

    engine().onerror!({ error: 'not-allowed' });
    await started;

    expect(recorder.getState().listening).toBe(false);
    expect(recorder.getState().error).toContain('micrófono');
    expect(recorder.getState().error).toContain('permiso');
  });

  it('maps an audio-capture error to a user-facing message', async () => {
    installFakeEngine();
    const recorder = new VoiceRecorder();
    const started = recorder.start();

    engine().onerror!({ error: 'audio-capture' });
    await started;

    expect(recorder.getState().listening).toBe(false);
    expect(recorder.getState().error).toContain('micrófono');
  });

  it('abort clears the transcript and stops listening', async () => {
    installFakeEngine();
    const recorder = new VoiceRecorder();
    await recorder.start();

    engine().onresult!(interimResultEvent('parcial'));
    recorder.abort();

    expect(recorder.getState().transcript).toBe('');
    expect(recorder.getState().final).toBe(false);
    expect(recorder.getState().listening).toBe(false);
  });

  it('stops listening when the engine ends without error', async () => {
    installFakeEngine();
    const recorder = new VoiceRecorder();
    const started = recorder.start();

    engine().onend!({});
    await started;

    expect(recorder.getState().listening).toBe(false);
  });
});

describe('VoiceRecorder permission', () => {
  it('reports granted permission when the Permissions API allows it', async () => {
    installFakeEngine();
    setNavigator({
      permissions: { query: async () => ({ state: 'granted' }) },
    });
    const recorder = new VoiceRecorder();
    const state = await recorder.requestPermission();
    expect(state).toBe('granted');
  });

  it('reports denied permission when the Permissions API denies it', async () => {
    installFakeEngine();
    setNavigator({
      permissions: { query: async () => ({ state: 'denied' }) },
    });
    const recorder = new VoiceRecorder();
    const state = await recorder.requestPermission();
    expect(state).toBe('denied');
  });

  it('defaults to prompt when the Permissions API is absent', async () => {
    installFakeEngine();
    setNavigator(undefined);
    const recorder = new VoiceRecorder();
    const state = await recorder.requestPermission();
    expect(state).toBe('prompt');
  });
});
