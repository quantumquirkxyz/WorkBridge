---
name: "repo-issue-copy"
category: "routing"
maturity: "experimental"
version: "1"
description: "Create one git worktree and one local agent per GitHub issue link, each branched from a named base branch, so several issues are implemented at the same time. Use when the user pastes GitHub issue URLs, asks to fan issues out to parallel agents, or names repo-issue-copy."
license: "MIT"
capabilities: ""
outputs: "Worktree manifest and one background local agent per open issue"
sideEffects:
  - git-worktree
  - launch-agent
dependencies: []
stopCondition: "Every open issue link has a worktree on its own branch from the requested base, a background local agent is running in that worktree, and the manifest is returned. Closed, foreign, or colliding issues are reported and not started."
risk: "medium"
trustTier: "3"
maxIterations: "4"
promptVersion: "2.0"
artifactType: "routing"
modelTier: "router"
evaluators: []
fixturesPath: ""
diataxis: "how-to"
tags: ["routing", "github", "worktree"]
compatibility: ["git", "gh"]
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: one or more `https://github.com/<owner>/<repo>/issues/<number>` links, plus the base branch name.
- Output: a manifest of worktree path, branch, and agent for each issue that started.
- Scope: the current git checkout's GitHub repo. Do not implement the issues in this agent.
- Rule: create nothing and launch nothing when the base branch or a link is missing, when a link is not an issue in this repo, or when any selected issue is closed or already has a worktree or branch.

## Provenance

| Question | Answer |
|---|---|
| What is the source of truth? | The issue links and the base branch the user named |
| What is in scope? | Worktrees, branches, and one local agent per open issue |
| What is explicitly out of scope? | Push, pull requests, merges, closing issues, and editing the primary checkout |
| Who or what consumes this artifact afterward? | The user, via the background agents and the printed manifest |
| What evidence proves it is done? | The prepare script printed `ok: true` and one background agent was launched per created worktree |
| What risk remains? | An agent may stop before the issue is finished; its branch stays unpushed |

## Workflow

1. Collect inputs. Issue links are the only issue selector. The base branch is a required name, not a default. If either is missing, ask once and stop.
2. From the repository root, prepare the worktrees:

```bash
node .agents/skills/repo-issue-copy/scripts/prepare-worktrees.mjs --base <branch> <issue-url>...
```

3. Read the JSON on stdout. If `ok` is not true, show `error` and `skipped`, create nothing further, and launch no agents.
4. When `ok` is true, launch every `created` entry in one message. Each entry is its own local general-purpose subagent, run in the background. Do not wait for one to finish before starting the next. Do not set a cloud environment. Do not pass a model unless the user named one.
5. Give each agent this prompt, with the values from that entry. The `prompt` field in the JSON is already filled; pass it through.

```text
You are working only in this git worktree: <path>
Branch <branch> is already checked out. Do not switch branches. Do not push. Do not touch the primary checkout or any other worktree.
Issue: <url>
Title: <title>
<body>

Implement this issue in this worktree. Follow the repository conventions. Run the tests that cover the change. When the change is complete, commit on this branch with a conventional message that references #<number>. Report the branch, the commits, and anything left open.
```

6. Reply with the manifest: issue URL, branch, absolute worktree path, and agent id. Include `skipped` when it is non-empty.

## Guardrails

- All issue links must be `https://github.com/<owner>/<repo>/issues/<number>` for the repo that `origin` points at. Pull request links and other repositories are skipped and block the run.
- The branch is `issue/<number>-<slug>`, created from the fetched base. The directory is a sibling of the repo: `<parent>/<repo-name>-worktrees/issue-<number>`.
- A closed issue, an existing branch, or an existing path blocks the whole run before any worktree is added.
- This agent does not edit product code and does not commit on the primary checkout.
- Re-running with the same links does not create a second worktree or a second agent. Report the existing paths.

## Completion

- the prepare script returned `ok: true`, or the run stopped with the blocking reason
- one background local agent was launched for each created worktree
- the manifest lists path, branch, issue, and agent id
---
@include .agents/skills/platform/contract-base.xml
