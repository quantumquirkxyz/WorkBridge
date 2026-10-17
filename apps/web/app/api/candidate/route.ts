import { NextResponse } from 'next/server';
import { candidateIdFromRequest, unauthorized } from '../../../lib/candidate-session';
import { deleteCandidateData } from '../../../lib/neon-repository';
import { handleDeleteCandidate } from '../../../lib/exploration-handler';
import { profileStore } from '../../../lib/profile-store';
import { getServerSession } from '../../../lib/auth';
import { makeCandidateId } from '@workbridge/domain';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const session = await getServerSession();
  if (!session?.user.id) return unauthorized();
  return NextResponse.json({ candidateId: makeCandidateId(session.user.id) });
}

export async function DELETE(request: Request): Promise<Response> {
  const candidateId = candidateIdFromRequest(request);
  if (!candidateId) return unauthorized();
  try {
    await deleteCandidateData(candidateId);
  } catch {
    return NextResponse.json({ error: 'persistence_unavailable' }, { status: 503 });
  }
  const result = handleDeleteCandidate(candidateId);
  profileStore.delete(candidateId);
  const body = result.body && typeof result.body === 'object' ? result.body : {};
  return NextResponse.json({ ...body, deleted: true, candidateId }, { status: 200 });
}
