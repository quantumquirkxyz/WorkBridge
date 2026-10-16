# ADR-0002: Define the employability system boundaries

## Status

Accepted

## Context

The competition requires a multi-agent system that acts on a real employability problem,
uses deterministic decisions, includes a human approval point, and provides traceability.
The team needs a scope that can be demonstrated within 24 hours without becoming a generic
chatbot or a full employment marketplace.

## Decision

Build Puente Laboral Panamá around one end-to-end flow:

1. capture CVs, credentials, projects, and declared experiences;
2. normalize candidate evidence and job requirements;
3. evaluate aptitude using deterministic requirements and constraints;
4. identify gaps and rank catalogued courses, certifications, projects, or internships;
5. generate an adapted application;
6. require explicit human approval before sending.

The system will initially focus on junior technical support, customer service, and
administrative roles across Panama Metro and Panama Oeste.

## Consequences

- The demo can prove impact through one complete workflow.
- Informal experience is included without treating it as an automatically verified credential.
- The project does not attempt to implement a complete job marketplace or live audio pipeline.
- A broader occupation taxonomy can be added after the competition MVP.
