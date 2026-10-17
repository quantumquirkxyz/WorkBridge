import { NextResponse } from 'next/server';
import { createSeedCatalog } from '@workbridge/catalog';
import { candidateIdFromRequestOrSession, unauthorized } from '../../../../lib/candidate-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ jobId: string }> }): Promise<Response> {
  const candidateId = await candidateIdFromRequestOrSession(request);
  if (!candidateId) return unauthorized();
  const { jobId } = await context.params;
  const vacancy = createSeedCatalog().get(jobId);
  if (!vacancy) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ jobId: vacancy.jobId, title: vacancy.title });
}
