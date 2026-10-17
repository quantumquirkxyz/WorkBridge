import Ajv2020, { type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

import commonSchema from './schemas/common.schema.json';
import evidenceSchema from './schemas/evidence.schema.json';
import skillSchema from './schemas/skill.schema.json';
import experienceSchema from './schemas/experience.schema.json';
import educationSchema from './schemas/education.schema.json';
import certificationSchema from './schemas/certification.schema.json';
import intakeSourceSchema from './schemas/intake-source.schema.json';
import candidateProfileSchema from './schemas/candidate-profile.schema.json';
import candidatePreferencesSchema from './schemas/candidate-preferences.schema.json';
import profileDraftSchema from './schemas/profile-draft.schema.json';
import intakeRequestSchema from './schemas/intake-request.schema.json';
import intakeResultSchema from './schemas/intake-result.schema.json';
import type {
  CandidatePreferences,
  CandidateProfile,
  IntakeRequest,
  IntakeResult,
  ProfileDraft,
} from './types';

/** Canonical `$id` for every versioned contract, JSON Schema 2020-12. */
export const SCHEMA_IDS = {
  common: 'https://puente-laboral.pa/schemas/common/1.0.0',
  evidence: 'https://puente-laboral.pa/schemas/evidence/1.0.0',
  skill: 'https://puente-laboral.pa/schemas/skill/1.0.0',
  experience: 'https://puente-laboral.pa/schemas/experience/1.0.0',
  education: 'https://puente-laboral.pa/schemas/education/1.0.0',
  certification: 'https://puente-laboral.pa/schemas/certification/1.0.0',
  intakeSource: 'https://puente-laboral.pa/schemas/intake-source/1.0.0',
  candidateProfile: 'https://puente-laboral.pa/schemas/candidate-profile/1.0.0',
  candidatePreferences: 'https://puente-laboral.pa/schemas/candidate-preferences/1.0.0',
  profileDraft: 'https://puente-laboral.pa/schemas/profile-draft/1.0.0',
  intakeRequest: 'https://puente-laboral.pa/schemas/intake-request/1.0.0',
  intakeResult: 'https://puente-laboral.pa/schemas/intake-result/1.0.0',
} as const;

export const ALL_SCHEMAS: readonly object[] = [
  commonSchema,
  evidenceSchema,
  skillSchema,
  experienceSchema,
  educationSchema,
  certificationSchema,
  intakeSourceSchema,
  candidateProfileSchema,
  candidatePreferencesSchema,
  profileDraftSchema,
  intakeRequestSchema,
  intakeResultSchema,
];

export function createAjv(): Ajv2020 {
  const ajv = new Ajv2020({
    strict: true,
    // `if`/`then` branches intentionally re-`require` properties declared on the
    // root schema (e.g. `then: { required: ["text"] }`). That is valid JSON
    // Schema; Ajv's strictRequired is only a lint, so we relax just that rule.
    strictRequired: false,
    allErrors: true,
    allowUnionTypes: true,
  });
  addFormats(ajv);
  for (const schema of ALL_SCHEMAS) ajv.addSchema(schema);
  return ajv;
}

let cachedAjv: Ajv2020 | undefined;

function ajv(): Ajv2020 {
  if (!cachedAjv) cachedAjv = createAjv();
  return cachedAjv;
}

let cachedValidators: Map<string, ValidateFunction> | undefined;

function validators(): Map<string, ValidateFunction> {
  if (!cachedValidators) {
    const instance = ajv();
    const built = new Map<string, ValidateFunction>();
    for (const id of Object.values(SCHEMA_IDS)) {
      const compiled = instance.getSchema(id);
      if (!compiled) throw new Error(`Schema not registered: ${id}`);
      built.set(id, compiled);
    }
    // Only publish the cache once every schema compiled, so a failure never
    // leaves a partially-populated map behind.
    cachedValidators = built;
  }
  return cachedValidators;
}

export class ContractValidationError extends Error {
  readonly contract: string;
  readonly errors: string[];

  constructor(contract: string, errors: string[]) {
    super(`Invalid ${contract}: ${errors.join('; ')}`);
    this.name = 'ContractValidationError';
    this.contract = contract;
    this.errors = errors;
  }
}

function formatErrors(contract: string, errors: ErrorObject[] | null | undefined): string[] {
  return (errors ?? []).map((error) => {
    const path = error.instancePath || '/';
    return `${contract}${path} ${error.message ?? 'is invalid'}`;
  });
}

export type ValidationResult =
  | { valid: true }
  | { valid: false; errors: string[] };

function validateAgainst(contract: string, data: unknown): ValidationResult {
  const validate = validators().get(SCHEMA_IDS[contract as keyof typeof SCHEMA_IDS]!);
  if (!validate) throw new Error(`Unknown contract: ${contract}`);
  if (validate(data)) return { valid: true };
  return { valid: false, errors: formatErrors(contract, validate.errors) };
}

export function validateCandidateProfile(data: unknown): ValidationResult {
  return validateAgainst('candidateProfile', data);
}

export function validateCandidatePreferences(data: unknown): ValidationResult {
  return validateAgainst('candidatePreferences', data);
}

export function validateIntakeRequest(data: unknown): ValidationResult {
  return validateAgainst('intakeRequest', data);
}

export function validateProfileDraft(data: unknown): ValidationResult {
  return validateAgainst('profileDraft', data);
}

export function validateIntakeResult(data: unknown): ValidationResult {
  return validateAgainst('intakeResult', data);
}

export function assertCandidateProfile(data: unknown): asserts data is CandidateProfile {
  const result = validateCandidateProfile(data);
  if (!result.valid) throw new ContractValidationError('CandidateProfile', result.errors);
}

export function assertCandidatePreferences(data: unknown): asserts data is CandidatePreferences {
  const result = validateCandidatePreferences(data);
  if (!result.valid) throw new ContractValidationError('CandidatePreferences', result.errors);
}

export function assertIntakeRequest(data: unknown): asserts data is IntakeRequest {
  const result = validateIntakeRequest(data);
  if (!result.valid) throw new ContractValidationError('IntakeRequest', result.errors);
}

export function assertProfileDraft(data: unknown): asserts data is ProfileDraft {
  const result = validateProfileDraft(data);
  if (!result.valid) throw new ContractValidationError('ProfileDraft', result.errors);
}

export function assertIntakeResult(data: unknown): asserts data is IntakeResult {
  const result = validateIntakeResult(data);
  if (!result.valid) throw new ContractValidationError('IntakeResult', result.errors);
}
