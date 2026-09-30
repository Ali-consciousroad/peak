import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET() {
  const nonce = crypto.randomBytes(16).toString('hex');
  const cookieStore = cookies();

  // 5 minute nonce validity
  cookieStore.set('siwe_nonce', nonce, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 5,
  });

  const hdrs = headers();
  const host = hdrs.get('host') || '';
  const domain = host.split(':')[0];

  return NextResponse.json({ nonce, domain });
}


