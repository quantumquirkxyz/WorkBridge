import { createAjv } from '@workbridge/domain';
import { SLOT_IDS, type SlotId } from './slots';

const slotEnum = [...SLOT_IDS];

/** Full ChatTurn contract returned by POST /api/chat (source is for logs only). */
export const chatTurnSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['intent', 'reply', 'pendingSlot', 'slotUpdates', 'chips', 'phase', 'source'],
  properties: {
    intent: { enum: ['ask_slot', 'answer', 'confirm', 'complete_phase'] },
    reply: { type: 'string', minLength: 1, maxLength: 600, not: { pattern: '\\]\\(' } },
    pendingSlot: { enum: [...slotEnum, null] },
    slotUpdates: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['slot', 'value', 'state'],
        properties: {
          slot: { enum: slotEnum },
          value: {},
          state: { enum: ['proposed', 'incomplete'] },
        },
      },
    },
    chips: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'kind'],
        properties: {
          label: { type: 'string' },
          value: {},
          kind: { enum: ['answer', 'confirm', 'change', 'retry'] },
        },
      },
    },
    phase: { enum: ['profile', 'preferences', 'done'] },
    source: { enum: ['llm', 'fallback'] },
  },
} as const;

/** What the model is asked to produce; the server fills the rest. */
export const modelOutputJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['intent', 'reply', 'slotUpdates'],
  properties: {
    intent: { enum: ['ask_slot', 'answer', 'confirm'] },
    reply: { type: 'string', maxLength: 600 },
    slotUpdates: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['slot', 'value', 'state'],
        properties: {
          slot: { enum: slotEnum },
          value: { type: ['string', 'number', 'boolean'] },
          state: { enum: ['proposed', 'incomplete'] },
        },
      },
    },
  },
} as const;

export interface ChatTurn {
  intent: 'ask_slot' | 'answer' | 'confirm' | 'complete_phase';
  reply: string;
  pendingSlot: SlotId | null;
  slotUpdates: Array<{ slot: SlotId; value: unknown; state: 'proposed' | 'incomplete' }>;
  chips: Array<{ label: string; value?: unknown; kind: 'answer' | 'confirm' | 'change' | 'retry' }>;
  phase: 'profile' | 'preferences' | 'done';
  source: 'llm' | 'fallback';
}

type Validator = (value: unknown) => boolean;
let turnValidator: Validator | undefined;
let modelValidator: Validator | undefined;

export function validateChatTurn(value: unknown): value is ChatTurn {
  turnValidator ??= createAjv().compile(chatTurnSchema) as Validator;
  return turnValidator(value);
}

export function validateModelOutput(value: unknown): boolean {
  modelValidator ??= createAjv().compile(modelOutputJsonSchema) as Validator;
  return modelValidator(value);
}
