/**
 * GrantFlow AI — Edge-compatible Auth Config
 * Used by middleware (Edge Runtime — no Prisma, no bcrypt allowed here).
 * Full auth config with Prisma adapter lives in auth.ts.
 */
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  // Long-lived JWT session: sign in once, stay signed in for ~1 year.
  // maxAge   = how long the session/cookie stays valid (365 days).
  // updateAge = how often the token is refreshed on activity (every 24h).
  // Because maxAge is set, the cookie is persistent (survives browser restarts),
  // which gives "remember me" behavior by default without any UI change.
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 365, // 365 days
    updateAge: 60 * 60 * 24, // 24 hours
  },
  secret: process.env.AUTH_SECRET,

  // Required on Vercel / behind a proxy: Auth.js v5 otherwise rejects requests
  // with an "UntrustedHost" error because it cannot verify the request origin,
  // which breaks sign-in even when the build succeeds. Trusting the host lets
  // Auth.js infer the deployment URL from request headers when AUTH_URL is unset.
  trustHost: true,

  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },

  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage = nextUrl.pathname.startsWith("/auth");
      const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");

      // Always allow auth API routes
      if (isApiAuthRoute) return true;

      // Redirect logged-in users away from auth pages
      if (isAuthPage) {
        if (isLoggedIn) return Response.redirect(new URL("/dashboard", nextUrl));
        return true;
      }

      // Require login for everything else
      if (!isLoggedIn) return false;

      return true;
    },
    // Lightweight JWT callback — no DB access here (Edge Runtime)
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      if (token.organizationId !== undefined) {
        session.user.organizationId = token.organizationId as string | null;
      }
      if (token.role) session.user.role = token.role as string;
      return session;
    },
  },

  providers: [], // Actual providers are added in auth.ts
} satisfies NextAuthConfig;
