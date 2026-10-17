import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const fixturesDir = fileURLToPath(new URL("../fixtures/", import.meta.url));

/** Load a JSON fixture relative to `packages/solver/fixtures`. */
export function loadFixture<T>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(fixturesDir, relativePath), "utf8")) as T;
}
