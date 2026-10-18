import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { AgentId } from "@workbridge/domain";

export interface WorkflowDefinition {
  id: string;
  version: number;
  states: readonly AgentId[];
  transitions: Readonly<Record<string, string>>;
}

const WORKFLOW_FILE = join(dirname(new URL(import.meta.url).pathname), "workbridge-employability.yaml");

/** Loads the deliberately small, repository-owned workflow YAML subset. */
export function loadWorkflowDefinition(file = WORKFLOW_FILE): WorkflowDefinition {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  const id = lines.find((line) => line.startsWith("id: "))?.slice(4).trim();
  const version = Number(lines.find((line) => line.startsWith("version: "))?.slice(9).trim());
  const stateStart = lines.findIndex((line) => line === "states:");
  const transitionStart = lines.findIndex((line) => line === "transitions:");
  const states = lines
    .slice(stateStart + 1, transitionStart)
    .filter((line) => line.startsWith("  - "))
    .map((line) => line.slice(4).trim()) as AgentId[];
  const transitions = Object.fromEntries(
    lines.slice(transitionStart + 1)
      .filter((line) => line.startsWith("  "))
      .map((line) => line.trim().split(/:\s+/))
      .map(([from, to]) => [from, to]),
  );
  if (!id || !Number.isInteger(version) || states.length === 0 || Object.keys(transitions).length !== states.length - 1) {
    throw new Error(`Invalid workflow definition: ${file}`);
  }
  return { id, version, states, transitions };
}
