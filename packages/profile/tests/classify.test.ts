import { describe, expect, it } from 'vitest';
import { classifyExperience } from '../src/classify';
import { resolveTargetRoles } from '@puente/domain';

const soporte = resolveTargetRoles(['Soporte técnico']);

describe('classifyExperience', () => {
  it('asks for more evidence when the description is too short', () => {
    const result = classifyExperience({
      description: 'Ayudé',
      experienceType: 'informal_work',
      roles: soporte,
      skillIds: ['plp:hardware-troubleshooting'],
    });
    expect(result.relevance).toBe('requires_additional_evidence');
  });

  it('is not relevant when no skills overlap the target role', () => {
    const result = classifyExperience({
      description: 'Vendí ropa por mi cuenta durante las vacaciones de verano.',
      experienceType: 'informal_work',
      roles: soporte,
      skillIds: [],
    });
    expect(result.relevance).toBe('not_relevant');
    expect(result.reason).toContain('No overlap');
  });

  it('is relevant for a strong overlap with the target role', () => {
    const result = classifyExperience({
      description: 'Di soporte técnico, reparé computadoras y configuré la red de la oficina.',
      experienceType: 'formal_employment',
      roles: soporte,
      skillIds: ['plp:hardware-troubleshooting', 'plp:windows', 'plp:networking-basics'],
    });
    expect(result.relevance).toBe('relevant');
    expect(result.score).toBeGreaterThanOrEqual(0.5);
  });

  it('is partially relevant for a weak overlap', () => {
    const result = classifyExperience({
      description: 'Atendí clientes y manejé la caja en la tienda de mi familia los fines de semana.',
      experienceType: 'family_business',
      roles: resolveTargetRoles(['Atención al cliente']),
      skillIds: ['plp:point-of-sale'],
    });
    expect(result.relevance).toBe('partially_relevant');
  });

  it('is deterministic for the same input', () => {
    const input = {
      description: 'Atendí clientes y usé Excel para registrar pedidos.',
      experienceType: 'informal_work' as const,
      roles: soporte,
      skillIds: ['plp:excel', 'plp:customer-service'],
    };
    expect(classifyExperience(input)).toEqual(classifyExperience(input));
  });
});
