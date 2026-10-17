import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const FIXTURE_DIR = new URL("../fixtures/vacancies/", import.meta.url);

function fixtureUrl(name: string): string {
  return fileURLToPath(new URL(name, FIXTURE_DIR));
}

export function loadVacancyFixture<T = unknown>(name: string): T {
  return JSON.parse(readFileSync(fixtureUrl(name), "utf8")) as T;
}

export function loadBinaryFixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(fixtureUrl(name)));
}
