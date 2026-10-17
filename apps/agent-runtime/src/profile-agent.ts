import type { IntakeResult } from '@puente/domain';
import {
  buildProfile,
  heuristicProfileExtractor,
  provenanceForIntakeKind,
  type ProfileExtractor,
} from '@puente/profile';
import { extractText, type OcrAdapter, type PdfExtractor, type RawIntake } from '@puente/ingestion';

export interface ProfileAgentOptions {
  extractor?: ProfileExtractor;
  pdf?: PdfExtractor;
  ocr?: OcrAdapter;
  now?: () => Date;
}

export interface ProfileAgentRunContext {
  traceId: string;
  targetRoles?: string[];
  candidateId?: string;
  locale?: string;
}

/**
 * The Profile and Evidence agent for ticket #4. It converts one raw intake
 * submission into a validated `CandidateProfile` by composing ingestion and
 * deterministic normalization. It never submits an application and never lets
 * the model override the level/relevance rules.
 */
export class ProfileAgent {
  private readonly options: ProfileAgentOptions;

  constructor(options: ProfileAgentOptions = {}) {
    this.options = options;
  }

  get extractor(): ProfileExtractor {
    return this.options.extractor ?? heuristicProfileExtractor;
  }

  async run(raw: RawIntake, context: ProfileAgentRunContext): Promise<IntakeResult> {
    const { text, source, warnings } = await extractText(raw, {
      pdf: this.options.pdf,
      ocr: this.options.ocr,
      now: this.options.now,
    });

    return buildProfile(
      {
        text,
        source,
        provenance: provenanceForIntakeKind(raw.kind),
        traceId: context.traceId,
        targetRoles: context.targetRoles,
        candidateId: context.candidateId,
        locale: context.locale,
        warnings,
      },
      { extractor: this.options.extractor, now: this.options.now },
    );
  }
}

export function createProfileAgent(options: ProfileAgentOptions = {}): ProfileAgent {
  return new ProfileAgent(options);
}
