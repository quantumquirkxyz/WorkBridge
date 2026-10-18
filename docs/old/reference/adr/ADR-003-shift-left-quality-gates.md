# ADR-003: Shift-Left Quality Gates

## Status
Accepted

## Context
The original quirk method had a single quality gate (`check-all.mjs`) that ran at the end of the workflow. This meant defects were caught late, after implementation and review were complete.

## Decision
Implement 4-layer shift-left quality gates: IDE (file-save), pre-commit (git-commit), CI (push-to-PR), and post-merge (merge-to-main). Each layer has progressively broader checks and appropriate block/alert policies.

## Consequences

### Positive
- Defectos capturados 5-15x más barato (shift-left principle)
- Feedback inmediato en IDE (< 1s)
- PRs nunca se abren sin CI verde
- Producción monitoreada post-merge sin bloquear el flujo

### Negative
- Más configuracion inicial: requiere tooling en cada ambiente
- Riesgo de gate fatigue: si los gates son flaky, los developers los bypassan
- Overhead de mantenimiento: 4 skills de gates + fixtures

## Alternatives Considered

### A: Single gate at CI
Mantener un solo gate en CI. Pros: simple. Cons: feedback tardío, defects caros.

### B: IDE + CI only
Saltar pre-commit y post-merge. Pros: menos fricción. Cons: pre-commit catcha bugs antes de commit; post-merge catcha issues de producción.

### C: 4-layer gates (CHOSEN)
IDE + pre-commit + CI + post-merge. Pros: máxima cobertura, feedback en cada stage. Cons: overhead.

## Review
Revisar en 3 meses o cuando se superen 100 PRs procesados.

## Related
- ADR-001: Artifact-First Design
- ADR-002: State Machine Workflows
