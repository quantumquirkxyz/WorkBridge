# Safety Boundaries Reference

## Principles
- Least privilege: request only the minimum access required.
- Human in the loop: require human review for destructive or public actions.
- Audit everything: log all tool calls, inputs, and outputs.
- Fail closed: default to denying access when in doubt.
- Rollback ready: every integration has a tested rollback path.

## Approval Gates
- **Read-only:** no approval required beyond initial integration plan approval.
- **Supervised write:** human review required before each write.
- **Autonomous write:** human approval required for integration activation; periodic review required.

## Audit Requirements
- Log tool name, action, input, output, timestamp, and user.
- Store logs in a central, tamper-evident location.
- Retain logs for minimum 90 days or as required by policy.

## Incident Response
- **Quota exhaustion:** pause integration, notify owner, request limit increase or reduce usage.
- **API change:** pause integration, review changelog, update integration plan, re-approve.
- **Unauthorized access:** revoke credentials immediately, audit logs, notify security team.

## Fallback Behavior
- Define manual alternative for every automated use case.
- Document runbook for when integration is unavailable.
- Test fallback behavior before declaring integration production-ready.
