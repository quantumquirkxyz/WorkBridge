# PR Provider Guidelines

Map generic PR operations to the active code-hosting provider while preserving merge boundaries.

## Common mapping

| Generic action | GitHub | GitLab | Bitbucket | Forgejo/Gitea |
|---|---|---|---|---|
| create PR | pull request | merge request | pull request | pull request |
| update title/body | edit PR | edit MR | edit PR | edit PR |
| comment | issue comment / review comment | note / discussion | comment | comment |
| label | labels | labels | labels, if enabled | labels |
| request review | reviewers / teams | reviewers / approvers | reviewers | reviewers |
| mark ready | ready for review | remove draft | provider-specific | provider-specific |

## Safety checks

- Search for an open PR or MR with the same head/base pair before creating one.
- Treat review requests as external notifications.
- Treat draft-to-ready transitions as review-queue mutations.
- Do not merge, squash, rebase, close, delete branches, or edit branch protection from this skill.
- Do not claim validation passed unless command output or CI state was actually observed.
- When the provider supports templates, preserve existing required sections instead of replacing them wholesale.

## Provider unknown

If the provider is unknown, return the proposed PR operation summary and ask for the provider or target URL before mutating anything.
