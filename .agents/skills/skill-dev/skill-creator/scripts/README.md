# Skill Creator Scripts

The executable scripts for this skill live at the repository root under `scripts/` so they can be reused from CI and from generated skills:

- `scripts/interview_skill.py` runs the guided interview and can emit skill data.
- `scripts/init_skill.py` creates a skill directory from scratch or from interview results.
- `scripts/package_skill.py` validates a skill directory before promotion.
- `scripts/research_helpers.py` provides reusable research and naming helpers.

Run commands from the repository root unless a caller passes absolute paths.
