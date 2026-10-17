import type { CandidateCertification, IntakeResult } from '@workbridge/domain';
import {
  buildProfile,
  heuristicProfileExtractor,
  provenanceForIntakeKind,
  type ProfileExtractor,
} from '@workbridge/profile';
import { extractText, type OcrAdapter, type PdfExtractor, type RawIntake } from '@workbridge/ingestion';
import { verifyCredential, type CredentialInput, type VerifyDeps, type CredentialVerification } from './verification/index';

export interface ProfileAgentOptions {
  extractor?: ProfileExtractor;
  pdf?: PdfExtractor;
  ocr?: OcrAdapter;
  now?: () => Date;
  verificationDeps?: VerifyDeps;
  verifyCredential?: (input: CredentialInput, deps: VerifyDeps) => Promise<CredentialVerification>;
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

    const profileResult = await buildProfile(
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

    // Post-intake credential verification:
    // - For certifications with a credential_url, call verifyCredential and
    //   update the stored certification status.
    // - For certifications without a credential_url, keep status as 'declared'
    //   and do not call verifyCredential.
    const verifiedProfile = await this._applyCredentialVerification(
      profileResult,
      context.traceId,
    );

    return verifiedProfile;
  }

  private async _applyCredentialVerification(
    profileResult: IntakeResult,
    traceId: string,
  ): Promise<IntakeResult> {
    const deps = this.options.verificationDeps ?? { fetch };
    const verifier = this.options.verifyCredential ?? verifyCredential;
    const updatedCertifications = await Promise.all(profileResult.profile.certifications.map(
      async (certification): Promise<CandidateCertification> => {
        if (certification.credential_url) {
          const input: CredentialInput = {
            credentialId: certification.credential_url,
            traceId,
            declaredOnly: false,
          };
          const verification = await verifier(input, deps);
          // Map the verification status to the certification status
           const statusMap: Record<string, CandidateCertification['status']> = {
            verified: 'verified',
            declared: 'declared',
            unverified: 'unverified',
            rejected: 'rejected',
            partially_verified: 'partially_verified',
          };
          return {
            ...certification,
            status: statusMap[verification.status] ?? 'unverified',
            source: verification.externally_verified ? 'verified' : 'declared',
          };
        }
        // Certification without credential_url stays declared;
        // verifyCredential is not called.
        return {
          ...certification,
          status: 'declared',
        };
      },
    ));

    return {
      ...profileResult,
      profile: {
        ...profileResult.profile,
        certifications: updatedCertifications,
      },
    };
  }
}

export function createProfileAgent(options: ProfileAgentOptions = {}): ProfileAgent {
  return new ProfileAgent(options);
}
