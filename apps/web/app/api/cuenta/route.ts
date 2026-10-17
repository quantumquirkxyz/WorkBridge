import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { destinationAfterRegister, parseRegisterBody, safeNextPath, signUpErrorMessage } from '../../../lib/account-access';
import { assignRegisteredAccount, auth } from '../../../lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Revisa los datos e intenta otra vez.' }, { status: 400 });
  }

  const parsed = parseRegisterBody(json);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const requestedNext = json && typeof json === 'object' && 'next' in json && typeof json.next === 'string'
    ? json.next
    : undefined;

  try {
    const result = await auth.api.signUpEmail({
      body: {
        name: parsed.value.name,
        email: parsed.value.email,
        password: parsed.value.password,
      },
      headers: await headers(),
    });
    await assignRegisteredAccount(result.user.id, parsed.value.accountType, parsed.value.name);
    return NextResponse.json({
      redirectTo: destinationAfterRegister(parsed.value.accountType, safeNextPath(requestedNext)),
    });
  } catch (error) {
    const failure = signUpErrorMessage(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
