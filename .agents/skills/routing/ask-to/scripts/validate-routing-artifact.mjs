import fs from 'node:fs/promises';
import path from 'node:path';

const REQUIRED = ['currentState', 'selectedTransition', 'nextSkill', 'workflow'];

export async function validate(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  const data = JSON.parse(raw);
  const missing = REQUIRED.filter(k => !(k in data));
  if (missing.length) {
    console.error('Missing required fields:', missing.join(', '));
    process.exit(1);
  }
  console.log('RoutingArtifact valid:', path.basename(filePath));
}
