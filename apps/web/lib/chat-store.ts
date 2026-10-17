import type { ChatTranscriptMessage } from './chat/prompt';
import type { SlotState } from './chat/tracker';

/** A save was rejected because the stored version moved on since this session was read (409). */
export class ChatSessionConflictError extends Error {
  constructor() {
    super('chat_session_conflict');
    this.name = 'ChatSessionConflictError';
  }
}

/** Everything needed to restore a conversation after a reload or account link (AC-12). */
export interface ChatSession {
  transcript: ChatTranscriptMessage[];
  slotState: SlotState;
  /** LLM attempts so far; drives the 40-turn cap (AC-81). */
  llmTurns: number;
  capNoticeSent: boolean;
  /** Optimistic-lock version this session was read at; `save` requires it to match the stored one. */
  version: number;
}

export interface ChatSessionStore {
  /** Throws ChatSessionConflictError when `session.version` is stale; otherwise stores version + 1. */
  save(candidateId: string, session: ChatSession): void;
  get(candidateId: string): ChatSession | undefined;
  delete(candidateId: string): boolean;
}

export function createInMemoryChatSessionStore(): ChatSessionStore {
  const byCandidate = new Map<string, ChatSession>();
  return {
    save: (id, session) => {
      const current = byCandidate.get(id)?.version ?? 0;
      if (session.version !== current) throw new ChatSessionConflictError();
      byCandidate.set(id, { ...structuredClone(session), version: current + 1 });
    },
    get: (id) => {
      const found = byCandidate.get(id);
      return found ? structuredClone(found) : undefined;
    },
    delete: (id) => byCandidate.delete(id),
  };
}

export const chatSessionStore: ChatSessionStore = createInMemoryChatSessionStore();
