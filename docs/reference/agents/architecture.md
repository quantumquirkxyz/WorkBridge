# WorkBridge agent architecture

This diagram is the source of truth for the shipped agent workflow. It shows
the four agents registered in `apps/agent-runtime/src/workflow/graph.ts`, their
runtime tools, the data and execution planes, and every human approval boundary.
Application submission is deliberately outside the agent workflow.

```mermaid
flowchart LR
  subgraph DATA[Data plane]
    goals[(Candidate goals and preferences)]
    cv[(CV and declared credentials)]
    vacancies[(Vacancies and job requirements)]
    match[(Deterministic match decisions\nHiGHS + Google Maps)]
    roadmap[(Training catalog and roadmap)]
    drafts[(Application drafts and audit history)]
  end
  subgraph EXEC[Execution plane · Mastra workflow]
    exploration["Exploration Agent\ncapability: planning\ntool: read_goals"]
    profile["Profile and Evidence Agent\ncapability: extraction\ntools: read_cv, list_declared_credentials"]
    market["Market and Matching Agent\ncapability: matching\ntools: read_vacancy, match_skills"]
    training["Training Agent\ncapability: planning\ntool: suggest_course"]
    trace[(Langfuse traces)]
    audit[(Append-only audit log)]
  end
  subgraph HUMAN[Human approval points]
    candidate{{Candidate approves application draft}}
    counselor{{Counselor approves critical gaps, unverified credentials, bias, or transport}}
    employer{{Employer approves interview progression}}
  end
  goals --> exploration
  cv --> profile
  vacancies --> market
  exploration --> profile --> market --> training
  profile -->|normalized profile + evidence| match
  market -->|nomination and aptitude| match
  match --> training
  training --> roadmap
  exploration -. envelope / span .-> trace
  profile -. envelope / span .-> trace
  market -. envelope / span .-> trace
  training -. envelope / span .-> trace
  market -. audit event .-> audit
  training -. audit event .-> audit
  match -->|draft input| drafts
  drafts --> candidate
  counselor --> drafts
  candidate -->|approved draft| drafts
  drafts -->|submitted application| employer
  employer -->|approved interview| drafts
```

## Runtime contract

The execution plane runs in this order: `exploration` →
`profile_and_evidence` → `market_and_matching` → `training`. Every step emits
an agent envelope, lifecycle record, and trace span. Audit events are emitted
for the matching and training paths shown above, and for model-completion and
guardrail outcomes where applicable; the deterministic Exploration and Profile
paths publish their result without an audit event. Guardrails screen requested
tools, permissions, inputs, model output, and tool results;
`submit_application`, `progress_interview`, and `send_message` remain denied to
agents.

The data plane is separate from execution: profiles and vacancy documents enter
as validated contracts, matching is deterministic, and training consumes the
resulting gaps to build a roadmap. Certo credential verification and its
Accredible/Credly/mock fallbacks are part of the Profile and Evidence data path,
not additional workflow agents.

## Approval boundaries

1. A candidate must approve an application draft before submission.
2. A counselor must resolve critical gaps, unverified credentials, bias alerts,
   or transport constraints when those findings require review.
3. An employer must approve interview progression after an application is
   submitted.

No agent can bypass these boundaries. The bias auditor and simulated-interview
agent issues (#94 and #98) are not shipped yet, so they are intentionally not
shown as active agents in this diagram.
