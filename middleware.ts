import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Public routes accessible by everyone (logged in or not)
const PUBLIC_ROUTES = [
  "/",
  "/plans",
  "/about",
  "/contact",
  "/login",
  "/register",
  "/reset-password",
  "/checkout",
];

// Routes accessible by any authenticated user
const USER_ROUTES = ["/user", "/simulator", "/indicators"];

// Routes accessible only by ADMIN
const ADMIN_ROUTES = ["/admin"];

// Auth routes (redirect away if already logged in)
const AUTH_ONLY_ROUTES = ["/login", "/register", "/reset-password"];

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

function isAdminRoute(pathname: string) {
  return ADMIN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

function isUserRoute(pathname: string) {
  return USER_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

function isAuthOnlyRoute(pathname: string) {
  return AUTH_ONLY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip Next.js internals and static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/favicon") ||
    /\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|css|js|json|map)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Read the JWT token from cookie (NextAuth sets this automatically)
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET || "smartflowalgo_secret_key_2026",
  });

  const isLoggedIn = !!token;
  const userType = token?.userType as string | undefined;
  const isAdmin = userType === "ADMIN";

  // ── If logged in, block access to /login and /register ──
  if (isLoggedIn && isAuthOnlyRoute(pathname)) {
    const redirectTo = isAdmin ? "/admin" : "/user";
    return NextResponse.redirect(new URL(redirectTo, req.url));
  }

  // ── Admin routes: only ADMIN ──
  if (isAdminRoute(pathname)) {
    if (!isLoggedIn) {
      const url = new URL("/login", req.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    if (!isAdmin) {
      // Logged in but not admin → send to their dashboard
      return NextResponse.redirect(new URL("/user", req.url));
    }
    return NextResponse.next();
  }

  // ── User-protected routes: any authenticated user ──
  if (isUserRoute(pathname)) {
    if (!isLoggedIn) {
      const url = new URL("/login", req.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // ── Public routes: allow everyone ──
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // ── Everything else: require login ──
  if (!isLoggedIn) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on all routes except Next.js internals (handled manually above for flexibility)
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};