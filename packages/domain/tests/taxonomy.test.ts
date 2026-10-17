import { describe, expect, it } from 'vitest';
import {
  fnv1a,
  makeCandidateId,
  makeId,
  makeTraceId,
  matchMentions,
  matchSkill,
  normalizeTerm,
  resolveTargetRoles,
} from '../src/index';

describe('deterministic ids', () => {
  it('is stable for the same seed and differs for different seeds', () => {
    expect(fnv1a('cv.pdf')).toBe(fnv1a('cv.pdf'));
    expect(fnv1a('cv.pdf')).not.toBe(fnv1a('cv-2.pdf'));
  });

  it('produces schema-safe ids', () => {
    for (const id of [makeId('ev', 'x y/z'), makeTraceId('t'), makeCandidateId('candidate:1')]) {
      expect(id).toMatch(/^[A-Za-z0-9_.:-]+$/);
    }
  });
});

describe('skill taxonomy matching', () => {
  it('normalizes accents, case and separators', () => {
    expect(normalizeTerm('  Atención   al Cliente ')).toBe('atencion al cliente');
  });

  it('resolves synonyms to canonical skills', () => {
    expect(matchSkill('cajero')?.skill.skill_id).toBe('plp:point-of-sale');
    expect(matchSkill('Hoja de Cálculo')?.skill.skill_id).toBe('plp:excel');
  });

  it('does not match a short synonym inside an unrelated word', () => {
    // "redaccion" contains "red" but is not the networking skill.
    expect(matchSkill('redaccion de informes')?.skill.skill_id).not.toBe('plp:networking-basics');
  });

  it('prefers the longer, more specific mention', () => {
    const mentions = matchMentions('Manejo de redes sociales para la empresa');
    const ids = mentions.map((mention) => mention.skill.skill_id);
    expect(ids).toContain('plp:social-media');
    expect(ids).not.toContain('plp:networking-basics');
  });

  it('returns matches sorted by canonical id for reproducibility', () => {
    const ids = matchMentions('Excel, atención al cliente y trabajo en equipo').map((m) => m.skill.skill_id);
    expect(ids).toEqual([...ids].sort());
  });
});

describe('role resolution', () => {
  it('resolves a target role from free text', () => {
    const roles = resolveTargetRoles(['Quiero un puesto de soporte técnico']);
    expect(roles.map((role) => role.role_id)).toContain('plp:role:soporte-tecnico');
  });

  it('returns nothing for unrelated targets', () => {
    expect(resolveTargetRoles(['astronauta'])).toEqual([]);
  });
});
