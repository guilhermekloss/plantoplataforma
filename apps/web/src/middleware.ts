import { auth } from '@/auth';
import { NextResponse } from 'next/server';

/**
 * Protege /dashboard/* — redireciona para /login se não autenticado.
 */
export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const path = req.nextUrl.pathname;
  const isProtected =
    path.startsWith('/dashboard') ||
    path.startsWith('/contracts') ||
    path.startsWith('/assistant') ||
    path.startsWith('/campo') ||
    path.startsWith('/producao') ||
    path.startsWith('/mercado');

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL('/login', req.nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', path);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ['/dashboard/:path*', '/contracts/:path*', '/assistant/:path*'],
};
