import {
  makeTraceId,
  validateIntakeRequest,
  type IntakeRequest,
  type IntakeResult,
} from '@workbridge/domain';
import { createProfileAgent, type ProfileAgent } from '@workbridge/agent-runtime';
import type { RawIntake } from '@workbridge/ingestion';
import { mergeCandidateProfiles, profileNeedsReview } from '@workbridge/profile';
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
    const store = deps.profileStore ?? profileStore;
    let profile = result.profile;
    let body: IntakeResult = result;
    if (request.candidateId) {
      const existing = store.get(result.profile.candidate_id);
      if (existing) {
        profile = mergeCandidateProfiles(existing, result.profile);
        body = {
          ...result,
          profile,
          extraction: {
            ...result.extraction,
            needs_review: profileNeedsReview(profile),
            warnings: profile.warnings ?? [],
          },
        };
      }
    }
    store.save(profile);
    return { status: 200, body };
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
