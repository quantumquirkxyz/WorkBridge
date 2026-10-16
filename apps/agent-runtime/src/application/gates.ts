import type { MatchDecision } from "@puente/domain";
import type { EvidenceItem } from "./evidence";

export interface GateReason {
  code: "critical_gap" | "unverified_credential" | "bias_alert" | "infeasible_transport";
  detail: string;
}

export function counselorGateReasons(
  match: MatchDecision,
  evidence: readonly EvidenceItem[],
): GateReason[] {
  const reasons: GateReason[] = [];
  for (const gap of match.gaps) {
    if (gap.severity === "critical") {
      reasons.push({ code: "critical_gap", detail: gap.description });
    }
  }
  for (const item of evidence) {
    if (item.credentialStatus === "unverified") {
      reasons.push({ code: "unverified_credential", detail: item.id });
    }
  }
  for (const alert of match.biasAlerts) {
    reasons.push({ code: "bias_alert", detail: alert.reason });
  }
  if (!match.transport.feasible) {
    reasons.push({ code: "infeasible_transport", detail: match.transport.source });
  }
  return reasons;
}
