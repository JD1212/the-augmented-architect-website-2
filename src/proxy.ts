import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { authConfig } from '@/lib/marketing/config';

// Only owner pages: public pages, Scout and booking never run through this proxy.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  try {
    const { url, key } = authConfig();
    const db = createServerClient(url, key, {
      cookieOptions: { name: 'aa-owner-auth', httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 86400 },
      cookies: { getAll: () => request.cookies.getAll(), setAll: values => {
        for (const { name, value } of values) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of values) response.cookies.set(name, value, options);
      } },
    });
    await db.auth.getUser();
  } catch { /* Pages and APIs fail closed independently. */ }
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}
export const config = { matcher: ['/admin/:path*'] };
