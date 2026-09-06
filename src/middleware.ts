import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const protectedRoutes = [
  "/dashboard",
  "/courses/manage",
  "/settings",
  "/admin",
  "/api/courses/*/enroll",
  "/api/courses/*/assignments/*/submit",
  "/api/courses/*/quizzes/*/attempt",
  "/api/courses/*/lessons/*/progress",
  "/api/payments",
  "/api/certificates",
  "/api/dashboard",
  "/api/settings",
  "/api/ai",
];

const instructorRoutes = ["/courses/manage", "/api/courses", "/api/ai/content", "/api/ai/grading"];

const adminRoutes = ["/admin", "/api/admin"];

const publicApiRoutes = [
  "/api/auth",
  "/api/courses",
];

function isPathMatch(pathname: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    const regex = new RegExp(
      "^" + pattern.replace(/\*/g, "[^/]+").replace(/\//g, "\\/") + "$"
    );
    return regex.test(pathname);
  });
}

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    if (isPathMatch(pathname, publicApiRoutes) && !pathname.includes("/enroll") && !pathname.includes("/submit") && !pathname.includes("/attempt") && !pathname.includes("/progress")) {
      return NextResponse.next();
    }

    if (!token) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { success: false, error: "Authentication required" },
          { status: 401 }
        );
      }
      const signInUrl = new URL("/auth/login", req.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }

    if (isPathMatch(pathname, instructorRoutes)) {
      if (token.role !== "INSTRUCTOR" && token.role !== "ADMIN") {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json(
            { success: false, error: "Instructor access required" },
            { status: 403 }
          );
        }
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    if (isPathMatch(pathname, adminRoutes)) {
      if (token.role !== "ADMIN") {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json(
            { success: false, error: "Admin access required" },
            { status: 403 }
          );
        }
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    const response = NextResponse.next();
    response.headers.set("X-User-Id", token.id);
    response.headers.set("X-User-Role", token.role);

    return response;
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/courses/manage/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/api/courses/:path*/enroll",
    "/api/courses/:path*/assignments/:path*/submit",
    "/api/courses/:path*/quizzes/:path*/attempt",
    "/api/courses/:path*/lessons/:path*/progress",
    "/api/payments/:path*",
    "/api/certificates/:path*",
    "/api/dashboard/:path*",
    "/api/settings/:path*",
    "/api/ai/:path*",
    "/api/courses",
  ],
};
