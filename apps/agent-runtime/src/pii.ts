/**
 * Minimal PII redaction applied before any candidate text leaves the process
 * for an external model. The full PII vault from the grill doc is a later
 * concern; this keeps names/emails/phones out of the prompt in the meantime and
 * is deliberately conservative about what it replaces.
 */
export interface RedactionResult {
  text: string;
  replacements: number;
  kinds: string[];
}

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE = /(?:\+?\d[\d\s().-]{6,}\d)/g;
const ID_DOCUMENT = /\b(?:[A-Z]?-?\d{2,4}-?\d{3,4}-?\d{3,5})\b/g;

export function redactPii(input: string): RedactionResult {
  let text = input;
  let replacements = 0;
  const kinds = new Set<string>();

  text = text.replace(EMAIL, () => {
    replacements += 1;
    kinds.add('email');
    return '[EMAIL]';
  });
  text = text.replace(PHONE, () => {
    replacements += 1;
    kinds.add('phone');
    return '[PHONE]';
  });
  text = text.replace(ID_DOCUMENT, () => {
    replacements += 1;
    kinds.add('id_document');
    return '[ID]';
  });

  return { text, replacements, kinds: [...kinds].sort() };
}
