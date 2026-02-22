import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getAdminSessionCookieName } from '@/lib/adminAuth';

export async function GET(request: Request) {
  const store = await cookies();
  store.set(getAdminSessionCookieName(), '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });

  return NextResponse.redirect(new URL('/', request.url));
}
