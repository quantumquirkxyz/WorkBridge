import {
  makeTraceId,
  validateIntakeRequest,
  type IntakeRequest,
} from '@puente/domain';
import { createProfileAgent, type ProfileAgent } from '@puente/agent-runtime';
import type { RawIntake } from '@puente/ingestion';
import { profileStore, type ProfileStore } from './profile-store';

export interface IntakeHandlerDeps {
  agent?: ProfileAgent;
  now?: () => Date;
  profileStore?: ProfileStore;
}

export interface IntakeHandlerResult {
  status: number;
  body: unknown;
}

function decodeBase64(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, 'base64'));
}

/**
 * Pure intake handler shared by the Next.js route and the unit tests. It
 * validates the request against the IntakeRequest contract, runs the Profile
 * agent, and returns a status/body pair. No application is ever submitted.
 */
export async function handleIntake(
  payload: unknown,
  deps: IntakeHandlerDeps = {},
): Promise<IntakeHandlerResult> {
  const validation = validateIntakeRequest(payload);
  if (!validation.valid) {
    return {
      status: 400,
      body: { error: 'invalid_intake_request', details: validation.errors },
    };
  }

  const request = payload as IntakeRequest;
  const traceId =
    request.traceId ??
    makeTraceId(
      JSON.stringify([request.kind, request.fileName ?? '', (request.text ?? '').slice(0, 64)]),
    );

  const raw: RawIntake = {
    kind: request.kind,
    ref: request.fileName ? `intake:${request.fileName}` : `intake:${request.kind}`,
    mimeType: request.mimeType,
    text: request.text,
    altText: request.altText,
  };
  if (request.kind === 'pdf' || request.kind === 'image') {
    raw.bytes = decodeBase64(request.contentBase64 ?? '');
  }

  const agent = deps.agent ?? createProfileAgent({ now: deps.now });

  try {
    const result = await agent.run(raw, {
      traceId,
      targetRoles: request.targetRoles,
      candidateId: request.candidateId,
      locale: request.locale,
    });
    (deps.profileStore ?? profileStore).save(result.profile);
    return { status: 200, body: result };
  } catch (error) {
    return {
      status: 422,
      body: {
        error: 'intake_failed',
        message: error instanceof Error ? error.message : String(error),
        trace_id: traceId,
      },
    };
  }
}
