import { handlers } from "@/auth";

// Auth uses Prisma + bcrypt and must run in the Node.js runtime (never edge),
// and must be dynamic so credential checks run per-request — this also ensures
// the [auth] diagnostic logs in authorize/jwt/session are emitted on Vercel.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST } = handlers;
