import fs from 'node:fs/promises';
import path from 'node:path';

const REQUIRED = ['governanceIndexRead', 'requestType', 'downstreamSkill', 'completionCriteriaMet'];
const VALID_TYPES = ['spec', 'ticket', 'spec-audit', 'ticket-audit', 'corrective-ticket', 'project-board', 'pr-publication', 'review-fix-plan', 'closeout'];

export async function validate(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  const data = JSON.parse(raw);
  const missing = REQUIRED.filter(k => !(k in data));
  if (missing.length) {
    console.error('Missing required fields:', missing.join(', '));
    process.exit(1);
  }
  if (!VALID_TYPES.includes(data.requestType)) {
    console.error('Invalid requestType:', data.requestType);
    process.exit(1);
  }
  console.log('WorkItemRouter decision valid:', path.basename(filePath));
}
