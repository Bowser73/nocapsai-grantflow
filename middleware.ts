/**
 * GrantFlow AI — Route Middleware
 * Uses edge-compatible authConfig (no Prisma) for JWT verification.
 * The full Prisma-backed auth is only used in server components and API routes.
 */
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // brand/ holds public NoCapsAI logo and artwork used on the log-in and sign-up pages
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|public/).*)" ],
};
