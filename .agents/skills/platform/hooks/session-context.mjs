#!/usr/bin/env node
// session-context.mjs - SessionStart hook.
//
// Fires when an agent session opens in the repository.
// Its stdout is injected into the session context, so it
// is the cheapest place to put the navigation layer the
// quirk method needs before any work: the canonical
// vocabulary, the routing entry points, and the local
// gate command.
//
// The output is deliberately short (a few lines) so it
// does not compete with the work itself for context.
// Keep it under ~200 tokens.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

async function countSkills(skillsRoot) {
  let count = 0;
  const walk = async (dir) => {
    let entries = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === 'platform') continue;
      const child = path.join(dir, entry.name);
      if (await fs.stat(path.join(child, 'SKILL.md')).then((s) => s.isFile()).catch(() => false)) {
        count += 1;
      } else {
        await walk(child);
      }
    }
  };
  await walk(skillsRoot);
  return count;
}

async function main() {
  const repoRoot = process.cwd();
  const skillsRoot = path.join(repoRoot, '.agents', 'skills');
  const skills = await countSkills(skillsRoot);
  const lines = [
    `[quirk skills] ${skills} canonical skills loaded from .agents/skills/ (platform tooling excluded).`,
    '[quirk skills] route ambiguous work: ask-to -> grill-with-docs -> to-spec -> to-tickets -> implement -> publish-open-pr -> review-pr -> ship-subissue.',
    '[quirk skills] validate before claiming done: node .agents/skills/platform/check-all.mjs',
    '[quirk skills] vocabulary and conventions: CONTEXT.md; method reference: docs/explanation/quirk-method.md',
  ];
  console.log(lines.join('\n'));
  return 0;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      process.stderr.write(`[session-context] crashed: ${error?.message ?? error}\n`);
      process.exit(0);
    },
  );
}
