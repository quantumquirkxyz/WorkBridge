import { z } from "zod";

export const carrierSchema = z.object({
  traceId: z.string(),
  idempotencyKey: z.string(),
  candidateText: z.string(),
  vacancyText: z.string(),
  declaredCredentials: z.array(z.object({ id: z.string(), name: z.string() })),
  actorId: z.string(),
  actorRole: z.enum(["candidate", "counselor", "employer", "system"]),
  requestedTools: z.array(z.string()),
  halted: z.boolean(),
  status: z.enum(["running", "success", "rejected", "dead_letter"]),
  findings: z.array(
    z.object({
      allowed: z.boolean(),
      stage: z.enum(["input", "tool_result", "permission", "output", "schema"]),
      code: z.enum([
        "ok",
        "prompt_injection",
        "pii_leak",
        "invalid_schema",
        "invented_credential",
        "unauthorized_tool",
      ]),
      reason: z.string(),
      source: z.string(),
    }),
  ),
  summaries: z.array(
    z.object({
      agent: z.enum([
        "exploration",
        "profile_and_evidence",
        "market_and_matching",
        "training",
      ]),
      summary: z.string(),
    }),
  ),
  modelFallbacks: z.array(
    z.object({
      capability: z.string(),
      from: z.string(),
      to: z.string(),
    }),
  ),
});

export type Carrier = z.infer<typeof carrierSchema>;
