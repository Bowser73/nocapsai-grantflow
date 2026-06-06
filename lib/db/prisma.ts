/**
 * Prisma Client Singleton
 * Prevents multiple instances during Next.js hot reloads in development.
 *
 * The client is created LAZILY (on first property access) via a Proxy so that
 * simply importing this module never constructs a client or touches the
 * database at build time. This keeps `next build` / Vercel's "collect page
 * data" step safe even when DATABASE_URL is not present in the build env.
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

// Proxy defers construction until a property/method is actually accessed at
// request time. No PrismaClient is instantiated merely by importing this file.
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export default prisma;
