import { normalizeTerm } from './skills';

/**
 * Seed role map for the three MVP occupation families (ADR-0002). Each role
 * lists the taxonomy skills that count as relevant so the relevance classifier
 * stays deterministic and auditable.
 */
export interface RoleDefinition {
  role_id: string;
  name: string;
  keywords: string[];
  skill_ids: string[];
}

export const ROLE_CATALOG: readonly RoleDefinition[] = [
  {
    role_id: 'plp:role:soporte-tecnico',
    name: 'Soporte técnico',
    keywords: ['soporte tecnico', 'soporte', 'tecnico', 'help desk', 'mesa de ayuda', 'it support', 'tecnologia'],
    skill_ids: [
      'plp:customer-support-tools',
      'plp:hardware-troubleshooting',
      'plp:windows',
      'plp:networking-basics',
      'plp:communication',
      'plp:problem-solving',
    ],
  },
  {
    role_id: 'plp:role:atencion-cliente',
    name: 'Atención al cliente',
    keywords: ['atencion al cliente', 'servicio al cliente', 'call center', 'customer service', 'atencion al publico', 'ventas'],
    skill_ids: [
      'plp:customer-service',
      'plp:communication',
      'plp:point-of-sale',
      'plp:responsibility',
      'plp:teamwork',
    ],
  },
  {
    role_id: 'plp:role:asistente-administrativo',
    name: 'Asistente administrativo',
    keywords: ['asistente administrativo', 'administrativo', 'asistente', 'secretaria', 'oficina', 'administracion', 'recepcionista'],
    skill_ids: [
      'plp:office-suite',
      'plp:excel',
      'plp:word',
      'plp:data-entry',
      'plp:organization',
      'plp:attention-to-detail',
      'plp:responsibility',
    ],
  },
] as const;

export const ROLE_BY_ID: ReadonlyMap<string, RoleDefinition> = new Map(
  ROLE_CATALOG.map((role) => [role.role_id, role]),
);

/** Resolve free-text target roles to catalog roles by keyword or exact name. */
export function resolveTargetRoles(targetRoles: readonly string[] | undefined): RoleDefinition[] {
  if (!targetRoles || targetRoles.length === 0) return [];
  const resolved = new Map<string, RoleDefinition>();
  for (const target of targetRoles) {
    const needle = normalizeTerm(target);
    if (!needle) continue;
    const direct = ROLE_CATALOG.find((role) => normalizeTerm(role.name) === needle);
    if (direct) {
      resolved.set(direct.role_id, direct);
      continue;
    }
    for (const role of ROLE_CATALOG) {
      if (role.keywords.some((keyword) => needle.includes(keyword) || keyword.includes(needle))) {
        resolved.set(role.role_id, role);
      }
    }
  }
  return [...resolved.values()].sort((a, b) => a.role_id.localeCompare(b.role_id));
}

/** Union of the skills that any of the given roles treats as relevant. */
export function relevantSkillIds(roles: readonly RoleDefinition[]): Set<string> {
  const ids = new Set<string>();
  for (const role of roles) for (const skillId of role.skill_ids) ids.add(skillId);
  return ids;
}
