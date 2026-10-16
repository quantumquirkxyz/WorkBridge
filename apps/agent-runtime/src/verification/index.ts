export {
  mandatoryCredentialSatisfied,
  normalizeVerification,
  type CredentialVerification,
  type EvidenceItem,
  type HolderBinding,
  type ProviderName,
  type RevocationStatus,
  type VerificationSignals,
  type VerificationStatus,
} from "./status.js";
export { validateCredentialVerification } from "./schema.js";
export { verifyCredential, type CredentialInput, type VerifyDeps } from "./verify.js";
