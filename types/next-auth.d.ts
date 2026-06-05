/**
 * Extend NextAuth types to include organizationId and role on session.user
 */
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      organizationId: string | null;
      role: string;
    };
  }
}
