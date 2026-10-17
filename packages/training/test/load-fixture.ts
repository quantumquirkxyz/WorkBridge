import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const fixturesDir = fileURLToPath(new URL("../fixtures/", import.meta.url));
const solverFixturesDir = fileURLToPath(new URL("../../solver/fixtures/", import.meta.url));

function read<T>(root: string, relativePath: string): T {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8")) as T;
}

/** Load a JSON fixture relative to `packages/training/fixtures`. */
export function loadFixture<T>(relativePath: string): T {
  return read<T>(fixturesDir, relativePath);
}

/** Load a solver fixture (ticket #8) relative to `packages/solver/fixtures`. */
export function loadSolverFixture<T>(relativePath: string): T {
  return read<T>(solverFixturesDir, relativePath);
}
