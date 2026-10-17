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
} from "./status";
export { validateCredentialVerification } from "./schema";
export { confusionMatrix, type ConfusionMatrix } from "./metrics";
export { verifyCredential, type CredentialInput, type VerifyDeps } from "./verify";
export { verificationConfigFromEnv } from "./config";
