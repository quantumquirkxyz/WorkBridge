---
description: "Multimodal prompting (vision, audio, video, image generation, vision-language models)"
---
# multimodal-prompting

When to use: Multimodal prompting (vision, audio, video, image generation, vision-language models)

## Workflow

1. Modality specs
2. Prompt design
3. Chain-of-thought and RAG
4. Validation suite
5. Fallback and escalation

## Deliverables

- pull-request artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: reasoning

Stop when: Each modality green on acceptance suite with validation and fallback.
