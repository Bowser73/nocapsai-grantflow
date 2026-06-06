/**
 * GrantFlow AI — Full NextAuth v5 Configuration
 * Runs in Node.js (server components, API routes) — Prisma is safe here.
 * Middleware uses the edge-compatible auth.config.ts instead.
 */
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db/prisma";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  adapter: PrismaAdapter(prisma),

  providers: [
    // ── Google OAuth ──────────────────────────────────────────────────────────
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
          }),
        ]
      : []),

    // ── Email + Password ──────────────────────────────────────────────────────
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });

          if (!user || !user.passwordHash) return null;

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.passwordHash
          );

          if (!isValid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          };
        } catch (err) {
          // Surfaces real causes (e.g. DB unreachable or tables not migrated)
          // in server logs WITHOUT exposing credentials or secrets to the client.
          // The user still sees a generic "Invalid email or password" message.
          console.error(
            "[auth] credentials authorize failed:",
            err instanceof Error ? err.message : String(err)
          );
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      // Enrich token with org and role from DB (runs in Node.js — Prisma is fine here).
      // Wrapped so a transient DB issue does not throw and invalidate the whole
      // session/token; the user stays signed in and onboarding handles missing org.
      if (token.sub) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { organizationId: true, role: true },
          });
          if (dbUser) {
            let orgId = dbUser.organizationId;

            // Auto-link: if this user has no org, check whether exactly one org exists.
            // If so, link them automatically so they immediately see real data.
            // For 0 orgs: leave null (onboarding page handles creation).
            // For 2+ orgs: leave null (onboarding page handles selection).
            if (!orgId) {
              const orgCount = await prisma.organization.count();
              if (orgCount === 1) {
                const singleOrg = await prisma.organization.findFirst({
                  select: { id: true },
                });
                if (singleOrg) {
                  await prisma.user.update({
                    where: { id: token.sub as string },
                    data: { organizationId: singleOrg.id },
                  });
                  orgId = singleOrg.id;
                }
              }
            }

            token.organizationId = orgId;
            token.role = dbUser.role;
          }
        } catch (err) {
          console.error(
            "[auth] jwt org/role enrichment failed:",
            err instanceof Error ? err.message : String(err)
          );
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
        session.user.organizationId = token.organizationId as string | null;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});
