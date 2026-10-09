# Tracker Provider Guidelines

Map generic issue operations to the active tracker without broadening authority.

## Common mapping

| Generic action | GitHub Issues | GitLab Issues | Linear | Jira |
|---|---|---|---|---|
| create issue | create issue | create issue | create issue | create issue/task |
| update body/title | edit issue | edit issue | update issue | edit issue |
| comment | add issue comment | add note | add comment | add comment |
| label | add/remove labels | add/remove labels | set labels | set labels/components |
| assign | assignees | assignees | assignee/team | assignee |
| close | close issue | close issue | done/canceled state | done/resolution |
| link PR | linked closing keyword or manual comment | closing pattern or related MR | related PR URL | development link or comment |

## Safety checks

- Prefer provider IDs and URLs over title-only matching.
- Search before creating when the title, branch, or work item looks familiar.
- Do not infer labels from vague wording if labels trigger automation.
- Do not close an issue merely because a PR exists; require merge, accepted validation, or explicit user direction.
- If the provider has workflow states, treat state transitions as higher risk than comments or labels.
- If notifications are sent by assignment or mention, mention that in the operation summary.

## Provider unknown

If the tracker is unknown, return a plan with the exact operation summary and ask for the provider or target URL before mutating anything.
