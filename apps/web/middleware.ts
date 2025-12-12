import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|api/inngest).*)"]
};

// Protected routes that require authentication
const protectedRoutes = [
  "/dashboard",
  "/flows",
  "/runs",
  "/settings",
  "/billing",
  "/members",
  "/connectors",
  "/templates",
  "/onboarding",
  "/help"
];

// Public routes that don't require authentication
const publicRoutes = [
  "/",
  "/auth",
  "/api/auth",
  "/docs"
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Check if the route is public
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route + "/"));
  
  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname === route || pathname.startsWith(route + "/"));

  // Allow public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check authentication for protected routes
  // Note: In Edge runtime, we check for session cookies directly
  // The actual session validation happens server-side in the page components
  if (isProtectedRoute) {
    // Check for NextAuth v5 JWT session cookies
    // In development (HTTP), cookie is: authjs.session-token
    // In production (HTTPS), cookie is: __Secure-authjs.session-token
    const sessionToken = 
      req.cookies.get("authjs.session-token")?.value ||
      req.cookies.get("__Secure-authjs.session-token")?.value ||
      req.cookies.get("next-auth.session-token")?.value ||
      req.cookies.get("__Secure-next-auth.session-token")?.value;
    
    if (!sessionToken) {
      // Redirect to sign in page
      const signInUrl = new URL("/auth/signin", req.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Basic security header hardening already in next.config headers
  // Could add CSP via nonce here if needed for stricter mode.
  return NextResponse.next();
}
