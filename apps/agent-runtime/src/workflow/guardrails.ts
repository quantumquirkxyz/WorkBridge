import {
  assertAgentEnvelope,
  assertWorkflowRun,
  normalizeText,
  type ActorRole,
  type AgentId,
  type DeclaredCredentialClaim,
} from "@puente/domain";

export type GuardrailStage = "input" | "tool_result" | "permission" | "output" | "schema";

export type GuardrailCode =
  | "ok"
  | "prompt_injection"
  | "pii_leak"
  | "invalid_schema"
  | "invented_credential"
  | "unauthorized_tool";

export interface GuardrailDecision {
  allowed: boolean;
  stage: GuardrailStage;
  code: GuardrailCode;
  reason: string;
  source: string;
}

const INJECTION_PATTERNS: readonly RegExp[] = [
  /ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions/i,
  /ignora\s+las\s+instrucciones/i,
  /olvida(?:r)?\s+las\s+instrucciones/i,
  /reveal\s+the\s+system\s+prompt/i,
  /you\s+are\s+now\b/i,
  /\bjailbreak\b/i,
  /disregard\s+(?:the\s+)?(?:rules|policy|instructions)/i,
];

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE = /(?:\+507[\s-]?)?\b\d{4}[\s-]\d{4}\b/;
const CEDULA = /\b\d{1,2}-\d{1,4}-\d{1,6}\b/;
const CLAIM = /(?:credencial|credential|certificado)\s*:\s*([^\n.]{2,80})/gi;

const AGENT_TOOLS: Record<AgentId, readonly string[]> = {
  exploration: ["read_goals"],
  profile_and_evidence: ["read_cv", "list_declared_credentials"],
  market_and_matching: ["read_vacancy", "match_skills"],
  training: ["suggest_course"],
};

const ALWAYS_DENIED = new Set(["submit_application", "progress_interview", "send_message"]);

const EMPLOYER_DENIED = new Set(["read_cv", "list_declared_credentials"]);

export const DEFAULT_AGENT_TOOL: Record<AgentId, string> = {
  exploration: "read_goals",
  profile_and_evidence: "read_cv",
  market_and_matching: "read_vacancy",
  training: "suggest_course",
};

function allow(stage: GuardrailStage, source: string): GuardrailDecision {
  return { allowed: true, stage, code: "ok", reason: "passed", source };
}

function block(
  stage: GuardrailStage,
  code: Exclude<GuardrailCode, "ok">,
  reason: string,
  source: string,
): GuardrailDecision {
  return { allowed: false, stage, code, reason, source };
}

export function findInjection(text: string): string | null {
  for (const pattern of INJECTION_PATTERNS) {
    const match = pattern.exec(text);
    if (match?.[0]) return match[0];
  }
  return null;
}

export function findPii(text: string): "email" | "phone" | "cedula" | null {
  if (EMAIL.test(text)) return "email";
  if (PHONE.test(text)) return "phone";
  if (CEDULA.test(text)) return "cedula";
  return null;
}

export function redactPii(text: string): string {
  return text
    .replace(EMAIL, "[redacted-email]")
    .replace(PHONE, "[redacted-phone]")
    .replace(CEDULA, "[redacted-cedula]");
}

export function screenInput(text: string, source: string): GuardrailDecision {
  const injection = findInjection(text);
  if (injection) {
    return block(
      "input",
      "prompt_injection",
      `Instruction override detected: "${injection}"`,
      source,
    );
  }
  return allow("input", source);
}

export function screenPermission(input: {
  tool: string;
  agent: AgentId;
  role: ActorRole;
  source?: string;
}): GuardrailDecision {
  const source = input.source ?? input.tool;
  if (ALWAYS_DENIED.has(input.tool) || !AGENT_TOOLS[input.agent].includes(input.tool)) {
    return block(
      "permission",
      "unauthorized_tool",
      `Tool "${input.tool}" is not permitted for ${input.agent}`,
      source,
    );
  }
  if (input.role === "employer" && EMPLOYER_DENIED.has(input.tool)) {
    return block(
      "permission",
      "unauthorized_tool",
      `Role ${input.role} cannot call "${input.tool}"`,
      source,
    );
  }
  return allow("permission", source);
}

export function screenRequestedTool(tool: string, role: ActorRole): GuardrailDecision {
  const known = (Object.values(AGENT_TOOLS) as readonly (readonly string[])[]).some((tools) =>
    tools.includes(tool),
  );
  if (ALWAYS_DENIED.has(tool) || !known) {
    return block(
      "permission",
      "unauthorized_tool",
      `Tool "${tool}" is not on the workflow allowlist`,
      tool,
    );
  }
  if (role === "employer" && EMPLOYER_DENIED.has(tool)) {
    return block(
      "permission",
      "unauthorized_tool",
      `Role ${role} cannot call "${tool}"`,
      tool,
    );
  }
  return allow("permission", tool);
}

export function inventedCredentialNames(
  claimed: readonly DeclaredCredentialClaim[],
  declared: readonly DeclaredCredentialClaim[],
): string[] {
  const known = new Set(declared.map((credential) => normalizeText(credential.name)));
  return claimed
    .filter((credential) => !known.has(normalizeText(credential.name)))
    .map((credential) => credential.name);
}

export function extractCredentialClaims(text: string): string[] {
  const names: string[] = [];
  for (const match of text.matchAll(CLAIM)) {
    const name = match[1]?.trim();
    if (name) names.push(name);
  }
  return names;
}

function claimsFromText(text: string): DeclaredCredentialClaim[] {
  return extractCredentialClaims(text).map((name) => ({ id: `claim:${normalizeText(name)}`, name }));
}

export function screenToolResult(input: {
  tool: string;
  agent: AgentId;
  role: ActorRole;
  body: string;
  declaredCredentials: readonly DeclaredCredentialClaim[];
  claimedCredentials?: readonly DeclaredCredentialClaim[];
}): GuardrailDecision {
  const permission = screenPermission({
    tool: input.tool,
    agent: input.agent,
    role: input.role,
    source: input.tool,
  });
  if (!permission.allowed) {
    return { ...permission, stage: "tool_result" };
  }
  const injection = findInjection(input.body);
  if (injection) {
    return block(
      "tool_result",
      "prompt_injection",
      `Tool result tried to override instructions: "${injection}"`,
      input.tool,
    );
  }
  const invented = inventedCredentialNames(
    input.claimedCredentials ?? claimsFromText(input.body),
    input.declaredCredentials,
  );
  if (invented.length > 0) {
    return block(
      "tool_result",
      "invented_credential",
      `Credential is not in the declared set: ${invented.join(", ")}`,
      input.tool,
    );
  }
  return allow("tool_result", input.tool);
}

export function screenOutput(input: {
  text: string;
  declaredCredentials: readonly DeclaredCredentialClaim[];
  claimedCredentials?: readonly DeclaredCredentialClaim[];
  source?: string;
}): GuardrailDecision {
  const source = input.source ?? "output";
  const injection = findInjection(input.text);
  if (injection) {
    return block("output", "prompt_injection", `Output carried an instruction override: "${injection}"`, source);
  }
  const pii = findPii(input.text);
  if (pii) {
    return block("output", "pii_leak", `Output exposed ${pii}`, source);
  }
  const invented = inventedCredentialNames(
    input.claimedCredentials ?? claimsFromText(input.text),
    input.declaredCredentials,
  );
  if (invented.length > 0) {
    return block(
      "output",
      "invented_credential",
      `Output invented a credential: ${invented.join(", ")}`,
      source,
    );
  }
  return allow("output", source);
}

export function screenSchema(
  document: unknown,
  contract: "envelope" | "workflow-run",
): GuardrailDecision {
  try {
    if (contract === "envelope") assertAgentEnvelope(document);
    else assertWorkflowRun(document);
    return allow("schema", contract);
  } catch (error) {
    const message = error instanceof Error ? error.message : "schema rejected the document";
    return block("schema", "invalid_schema", message, contract);
  }
}

export interface GuardrailFixture {
  id: string;
  stage: GuardrailStage;
  expect: { allowed: boolean; code: GuardrailCode };
  text?: string;
  source?: string;
  tool?: string;
  agent?: AgentId;
  role?: ActorRole;
  contract?: "envelope" | "workflow-run";
  document?: unknown;
  declaredCredentials?: DeclaredCredentialClaim[];
  claimedCredentials?: DeclaredCredentialClaim[];
}

export function evaluateGuardrailFixture(fixture: GuardrailFixture): GuardrailDecision {
  switch (fixture.stage) {
    case "input":
      return screenInput(fixture.text ?? "", fixture.source ?? fixture.id);
    case "output":
      return screenOutput({
        text: fixture.text ?? "",
        declaredCredentials: fixture.declaredCredentials ?? [],
        claimedCredentials: fixture.claimedCredentials,
        source: fixture.source ?? fixture.id,
      });
    case "permission":
      return screenPermission({
        tool: fixture.tool ?? "",
        agent: fixture.agent ?? "exploration",
        role: fixture.role ?? "candidate",
        source: fixture.source ?? fixture.tool,
      });
    case "tool_result":
      return screenToolResult({
        tool: fixture.tool ?? "",
        agent: fixture.agent ?? "profile_and_evidence",
        role: fixture.role ?? "candidate",
        body: fixture.text ?? "",
        declaredCredentials: fixture.declaredCredentials ?? [],
        claimedCredentials: fixture.claimedCredentials,
      });
    case "schema":
      return screenSchema(fixture.document, fixture.contract ?? "workflow-run");
    default: {
      const unknownStage: never = fixture.stage;
      throw new Error(`Unknown guardrail stage: ${String(unknownStage)}`);
    }
  }
}
