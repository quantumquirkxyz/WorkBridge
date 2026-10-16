# Golden Dataset

Reference traces and artifacts for regression testing. Each file represents a known-good execution of a skill under v2 format.

## Files

Two kinds of golden live side-by-side here:

- `*-v2.md` — golden **prompt** files. The canonical prompt text for a skill; used by `test-prompt-regression.mjs` to verify the live prompt in `.agents/skills/prompts/<skill>/v2.md` has not drifted.
- `*-v2.json` — golden **execution traces**. Structured records of a past skill run (model, tools, quality score, etc.); used by `test-trace-regression.mjs`, not by prompt regression.

Skills that only have a `.json` golden (e.g. `feature-flag`, `gate-ci`, `trunk-based-workflow`) are intentionally excluded from prompt regression — there is no prompt reference to compare against, and comparing the live prompt against a JSON trace yields 0% similarity.

## Usage

Run prompt regression test:

```bash
node .agents/skills/platform/scripts/test-prompt-regression.mjs <skill-name> <version>
```

Compare execution traces:

```bash
node .agents/skills/platform/scripts/test-trace-regression.mjs <trace-file> <golden-file>
```
