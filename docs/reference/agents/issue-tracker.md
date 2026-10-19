# Issue tracker: GitHub

Issues and PRDs for this repository live in GitHub Issues. Use the `gh` CLI for all tracker operations.

Repository: `quantumquirkxyz/WorkBridge` (historical clone name: `Agent-Hackathon`)

## Conventions

- Create an issue: `gh issue create --title "..." --body "..."`
- Read an issue: `gh issue view <number> --comments`
- List issues: `gh issue list --state open`
- Comment on an issue: `gh issue comment <number> --body "..."`
- Apply or remove labels: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- Close an issue: `gh issue close <number> --comment "..."`

Infer the repository from the current clone; `gh` does this automatically.

## Pull requests as a triage surface

PRs as a request surface: no. External PRs are not treated as feature requests by default.
