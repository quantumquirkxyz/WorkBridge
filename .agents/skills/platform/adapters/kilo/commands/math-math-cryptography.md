---
description: "Analyse cryptographic constructions — symmetric, asymmetric, hashing, MACs, zero-knowledge — with security reductions, hardness assumptions, and attack analysis."
---
# math-cryptography

When to use: Analyse cryptographic constructions — symmetric, asymmetric, hashing, MACs, zero-knowledge — with security reductions, hardness assumptions, and attack analysis.

## Workflow

1. Identify the primitive type — symmetric encryption (block ciphers, stream ciphers), asymmetric (RSA, ECC, lattice-based), hash (collision-resistant, preimage), MAC / HMAC, signatures, key exchange, ZK proofs
2. State hardness assumptions — DLP, CDH, DDH, RSA,factoring, LWE, SIS; quantify security level in bits
3. Security goal — IND-CPA, IND-CCA, EUF-CMA, collision resistance, etc
4. Attack analysis — birthday (hash), meet-in-the-middle, side-channel, replay, forward secrecy, oracle attacks
5. Protocol design — if designing: use a well-known construction; do not invent primitives. Specify parties, messages, randomness sources, and secrets
6. Deliver — artifact: primitive, hardness assumption, security goal, attack surface, and a security verdict (strong / moderate / weak / broken)

## Deliverables

- math artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: reasoning

Stop when: Analyse cryptographic constructions complete; required sections present; completion criteria checked.
