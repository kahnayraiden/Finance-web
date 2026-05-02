import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from "jose";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "finance_app_super_secret_jwt_key_2026"
);

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get("session")?.value;

  const isAuthPage = request.nextUrl.pathname.startsWith('/login');
  const isApiAuthRoute = request.nextUrl.pathname.startsWith('/api/auth');
  
  // Exclude some public routes if necessary, but generally everything is protected.
  if (isApiAuthRoute) return NextResponse.next();

  let session = null;
  if (sessionCookie) {
    try {
      const { payload } = await jwtVerify(sessionCookie, SECRET_KEY, {
        algorithms: ["HS256"],
      });
      session = payload;
    } catch (e) {
      // invalid token
    }
  }

  // Redirect to login if unauthenticated and trying to access a protected route
  if (!session && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect to dashboard if authenticated and trying to access login
  if (session && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Admin routes protection
  if (request.nextUrl.pathname.startsWith('/admin') && session?.role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
