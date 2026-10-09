# ADR-002: State Machine Workflows

## Status
Accepted

## Context
The original quirk method used linear flowcharts (ask-to → grill → to-spec → to-tickets → implement → review → ship). This works for simple cases but cannot express conditional branches (conflicts, findings, escalations) or persist workflow state across sessions.

## Decision
Redesign workflows as explicit state machines defined in YAML, executed by `workflow-state-machine.mjs`. Each workflow has named states, typed transitions, and persistent checkpoints.

## Consequences

### Positive
- Ramas condicionales: conflict → resolving-merge-conflicts → review
- Checkpoints persistentes: el estado se guarda en `.agents/skills/platform/state/`
- Transiciones explícitas: no hay routing implícito en el texto del skill
- Ciclos controlados: review-fix-loop tiene `maxIterations`

### Negative
- Complejidad de implementación: requiere parser YAML + executor
- Fricción de authoring: los skills ya no contienen el flujo, solo referencian el workflow
- Debugging: las transiciones son archivos externos, no visibles en el skill

## Alternatives Considered

### A: Keep linear flowcharts
Mantener los diagramas Mermaid en Workflows.md. Pros: simplicidad. Cons: no ejecutable, no persistente.

### B: LangGraph / XState
Adoptar un framework de state machines. Pros: robusto. Cons: dependencia externa, overkill.

### C: YAML workflows (CHOSEN)
Definir workflows en YAML, ejecutar con script propio. Pros: portable, versionable, ejecutable. Cons: requiere mantenimiento del parser.

## Review
Revisar en 3 meses o cuando se superen 10 workflows en producción.

## Related
- ADR-001: Artifact-First Design
- ADR-003: Shift-Left Quality Gates
