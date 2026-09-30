import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifyMessage } from 'viem';

export async function POST(request: Request) {
  try {
    const { message, signature, address, chainId } = await request.json();
    const cookieStore = cookies();
    const nonceCookie = cookieStore.get('siwe_nonce');

    if (!nonceCookie?.value) {
      return NextResponse.json({ error: 'Missing nonce' }, { status: 400 });
    }

    const hdrs = headers();
    const host = hdrs.get('host') || '';
    const domain = host.split(':')[0];

    // Basic checks: nonce and domain must appear in the message
    if (!message.includes(`Nonce: ${nonceCookie.value}`) || !message.includes(`${domain} wants you to sign in`)) {
      return NextResponse.json({ error: 'Invalid message context' }, { status: 400 });
    }

    const verified = await verifyMessage({ address, message, signature });
    if (!verified) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Establish a short-lived session cookie bound to address and chain
    const session = {
      address,
      chainId: chainId ?? null,
      iat: Date.now(),
      exp: Date.now() + 1000 * 60 * 60, // 1 hour
    };

    cookieStore.set('siwe_session', JSON.stringify(session), {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60,
    });

    // Invalidate nonce after use
    cookieStore.set('siwe_nonce', '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}


