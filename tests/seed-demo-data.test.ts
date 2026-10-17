import { describe, expect, it } from 'vitest';
import { assertCandidatePreferences, assertCandidateProfile, makeCandidateId } from '@workbridge/domain';
import { seedAccounts, seedCounselors, seedEmployers, seedStudents } from '../scripts/seed/demo-data';

const STUDENT_FLOWS = [
  'j1_bienvenida',
  'j1_sin_cv',
  'j1_perfil_sin_preferencias',
  'j1_preferencias_a_medias',
  'j2_atencion_ciudad',
  'j2_fin_de_semana',
  'j2_remoto_administrativo',
  'j2_arraijan_ventas',
  'j2_pasantia',
  'j2_soporte_san_miguelito',
  'j3_salario_alto',
  'j3_fuera_de_zona',
  'j3_sin_opciones',
  'j4_retorno',
  'j4_experiencia_informal',
  'j5_borrar_datos',
  'j6_pregunta_libre',
];

describe('synthetic seed', () => {
  it('covers at least 15 student journeys and 15 employer accounts', () => {
    expect(seedStudents.length).toBeGreaterThanOrEqual(15);
    expect(seedEmployers.length).toBeGreaterThanOrEqual(15);
    expect(seedCounselors.length).toBeGreaterThanOrEqual(1);
    expect(new Set(seedStudents.map((item) => item.flow))).toEqual(new Set(STUDENT_FLOWS));
    expect(new Set(seedEmployers.map((item) => item.flow)).size).toBe(seedEmployers.length);
  });

  it('keeps accounts unique and ties each profile to the sign-in user', () => {
    const emails = seedAccounts.map((account) => account.email);
    const ids = seedAccounts.map((account) => account.userId);
    expect(new Set(emails).size).toBe(emails.length);
    expect(new Set(ids).size).toBe(ids.length);
    expect(emails.every((email) => email.endsWith('@seed.workbridge.test'))).toBe(true);

    for (const student of seedStudents) {
      const candidateId = makeCandidateId(student.account.userId);
      if (student.profile) {
        expect(student.profile.candidate_id).toBe(candidateId);
        assertCandidateProfile(student.profile);
      }
      if (student.preferences) {
        expect(student.preferences.candidate_id).toBe(candidateId);
        assertCandidatePreferences(student.preferences);
      }
      for (const search of student.searches ?? []) {
        expect(search.candidateId).toBe(candidateId);
        expect(search.preferences.candidate_id).toBe(candidateId);
      }
    }
  });

  it('places students at different points of the journey', () => {
    expect(seedStudents.some((item) => !item.profile && item.chat)).toBe(true);
    expect(seedStudents.some((item) => item.profile && !item.preferences)).toBe(true);
    expect(seedStudents.filter((item) => item.preferences).length).toBeGreaterThanOrEqual(10);
    expect(seedStudents.some((item) => (item.searches?.length ?? 0) >= 2 && item.visitedAt)).toBe(true);
    expect(seedStudents.find((item) => item.flow === 'j6_pregunta_libre')?.chat?.transcript.some((message) => message.role === 'user')).toBe(true);
    expect(seedEmployers.every((item) => item.account.employerOrgId === item.organization.id)).toBe(true);
  });
});
