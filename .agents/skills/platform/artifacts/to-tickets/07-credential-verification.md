# Build normalized credential verification

**Owner:** quantumquirkxyz  
**Parent spec:** #3  
**Labels:** `ready-for-agent`  
**Metadata:** work_type=Ticket; repo_scope=application; phase=build; priority=high; risk=high; sprint=hackathon

## Acceptance Criteria
- [ ] Implement `CertoVerifier` against the separate Certo deployment boundary.
- [ ] Implement Accredible and Credly fallback adapters.
- [ ] Implement deterministic mock fixtures with `externally_verified: false`.
- [ ] Normalize all providers to the same `CredentialVerification` contract.
- [ ] Separate document integrity, cryptographic proof, issuer trust/revocation, and holder binding.
- [ ] Return verified, partially_verified, declared, unverified, or rejected.
- [ ] Count a mandatory credential as satisfied only when verified.
- [ ] Execute and report the 15 ground-truth cases, including TP, TN, FP, and FN.

## Validation
Run provider contract tests, mock fixtures, fallback tests, holder-binding tests, and the complete credential confusion matrix.

## Blocked By
- None.
