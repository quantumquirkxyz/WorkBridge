# Side-Effect Matrix

Use this matrix to map implied operations to expected metadata. Choose the highest applicable risk and trust tier for the skill's required workflow.

| Operation family | Example verbs | Expected sideEffects | Typical risk | Typical trustTier | Notes |
|---|---|---|---|---:|---|
| Diagnostic only | inspect, audit, review, report | `[]` | low | 1 | No files or external systems change. |
| Local docs or fixtures | write docs, create fixture, update template | `write-files` or `write-docs` | low | 2 | Include path boundaries and validation. |
| Local code edits | implement, refactor, format, generate code | `write-code` | medium | 3 | Require tests and scope control. |
| Git metadata | commit, push, tag, branch | `commit-git`, `push-branch`, `create-tag` | medium | 3 | Push/tag operations affect collaboration state. |
| Issue tracker | create, update, comment, label, assign, close | `create-issue`, `update-issue`, `post-comment`, `label-issue`, `assign-issue`, `close-issue` | medium | 3 | Close/reopen/state transitions need explicit reason. |
| Pull request | create PR, update PR, comment, request review, label | `create-pull-request`, `update-pull-request`, `post-pr-comment`, `request-review`, `label-pull-request` | medium | 3 | Review requests can notify people. Merge is separate. |
| Messaging | send email, send chat, notify user/team | `send-message` or `external-notification` | medium | 3 | Require recipient and exact content. |
| Scheduling | create event, update calendar, invite people | `schedule-event`, `update-event`, `external-notification` | medium | 3 | Invites notify people and reserve time. |
| Deployment | deploy, rollback, promote environment | `deploy`, `rollback-deploy` | high | 4 | Require environment, rollback, and validation evidence. |
| Data destructive | delete, drop, purge, archive, revoke access | `delete-data`, `update-access` | high | 4 | Prefer explicit approval and recoverability notes. |

## Audit severity

- Blocker: the skill can mutate external/shared state but declares no matching side effect.
- Blocker: the skill can delete, deploy, merge, send, schedule, or alter access without a high enough risk boundary.
- Warning: the skill declares broad side effects that are not present in the body.
- Warning: dependencies are missing for a delegated required workflow.
- Informational: the skill is diagnostic and correctly declares `sideEffects: []`.
