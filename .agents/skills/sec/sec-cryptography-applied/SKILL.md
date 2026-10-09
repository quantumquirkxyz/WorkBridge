---
name: "sec-cryptography-applied"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Apply cryptography — encryption at rest / in transit, digital signatures, key management, MACs, TLS/PKI, HSM, secure enclaves — with implementation guidance and anti-patterns."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Design document saved; anti-patterns corrected or documented; checklist complete."
risk: "medium"
trustTier: "3"
maxIterations: "5"
promptVersion: "2.0"
artifactType: "sec"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/sec-cryptography-applied.json"
diataxis: "how-to"
tags: ["sec"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: data to protect, threat model, regulatory requirements.
- Output: cryptographic design + implementation checklist.
- Scope: designs cryptographic system; does not deploy unless explicitly executed.
- Rule: designs cryptographic system; does not deploy unless explicitly executed.
- Rule: documented standards override defaults; explicit project rules take precedence.
- Rule: if blocked by missing context or dependencies, surface the blocker before proceeding.

## Provenance

| Question | Answer |
|---|---|
| What is the source of truth? | The user's request, originating spec/issue, and the skill's declared outputs |
| What is in scope? | Work covered by the skill's acceptance criteria and completion rules |
| What is explicitly out of scope? | Files, behaviors, and decisions outside the skill's declared boundary |
| Who or what consumes this artifact afterward? | The next skill in the workflow or the user |
| What evidence proves it is done? | Completion criteria met, artifact saved, validation passed |
| What risk remains? | Subjective judgment calls, missing context, or external dependency failures


## Artifact

Emit `SecCryptographyAppliedArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/sec-cryptography-applied/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Applied Cryptography

Apply **cryptography** correctly — encryption, signatures, key management, TLS — with implementation guidance and anti-pattern detection.

## Process

### 1. Classify the data
- Sensitivity: public / internal / confidential / secret.
- Regulatory: GDPR (PII encryption), PCI-DSS (cardholder data), HIPAA (PHI), financial (PSD2), government (FIPS 140-2).
- At-rest vs in-transit vs in-use protection needed.

**Completion criterion:** data classification and protection requirements saved.

### 2. Choose primitives
- **Encryption:** AES-GCM (default), ChaCha20-Poly1305 (mobile / constrained), never ECB or unauthenticated CBC.
- **Key exchange:** X25519 (ECDH), RSA-KEM (hybrid).
- **Signatures:** Ed25519 (default), ECDSA (interoperability), RSA-PSS (legacy).
- **Hashing:** SHA-256 (SHA-3 as backup); Argon2id for passwords; BLAKE3 for fast hashing.
- **MAC:** HMAC-SHA256 (default); Poly1305 (with ChaCha20).

**Completion criterion:** primitives selected with justification.

### 3. Key management design
- **Generation:** cryptographically secure random number generator (CSPRNG); HSM for high-security keys.
- **Storage:** encrypted at rest; never hardcoded; use KMS (AWS KMS / GCP Cloud KMS / Azure Key Vault) or HSM.
- **Rotation:** automatic rotation schedule (e.g. annual for encryption keys; 90-day for session keys).
- **Destruction:** secure wipe when key expires.

**Completion criterion:** key management design saved.

### 4. TLS / PKI
- TLS 1.3 only (TLS 1.2 only if legacy requires; disable older versions).
- Cipher suite: only AEAD (AES-GCM, ChaCha20-Poly1305); disable RC4, 3DES, CBC.
- Certificate: issued by trusted CA; certificate chain validated; mutual TLS (mTLS) for service-to-service.
- HSTS header; OCSP stapling.

**Completion criterion:** TLS configuration documented.

### 5. Anti-pattern audit
Check for: hardcoded keys, password-based encryption (use KDF: Argon2id / scrypt), ECB mode, no MAC on encrypted data, IV reuse, missing key rotation, weak random, deprecated algorithms (MD5, SHA1 for signatures), lack of forward secrecy.

**Completion criterion:** anti-patterns listed; each fixed or documented with justification.

### 6. Deliver
Cryptographic design document + implementation checklist (key lengths, modes, rotation schedule) + anti-pattern corrections.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml