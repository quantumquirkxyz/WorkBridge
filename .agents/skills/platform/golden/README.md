# Golden Dataset

Reference traces and artifacts for regression testing. Each file represents a known-good execution of a skill under v2 format.

## Usage

Run prompt regression test:
```bash
node .agents/skills/platform/scripts/test-prompt-regression.mjs <skill-name> <version>
```

Compare execution traces:
```bash
node .agents/skills/platform/scripts/test-trace-regression.mjs <trace-file> <golden-file>
```

## Files

- `implement-v2.json` — Golden trace for implement skill
- `code-review-v2.json` — Golden trace for code-review skill
- `to-spec-v2.json` — Golden trace for to-spec skill
