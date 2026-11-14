/**
 * GrantFlow AI — Password reset tokens
 *
 * A reset link carries a random token. Only a SHA-256 hash of it is stored
 * (in the VerificationToken table, identifier "reset:<email>"), so a database
 * leak cannot be used to reset anyone's password. Links expire after an hour
 * and work once.
 */
import { createHash, randomBytes } from "crypto";
import prisma from "@/lib/db/prisma";

export const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const RESEND_COOLDOWN_MS = 2 * 60 * 1000; // at most one email per 2 minutes per address

export const resetIdentifier = (email: string) => `reset:${email.trim().toLowerCase()}`;
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Creates a fresh token for this email, replacing older ones. Returns null during the cooldown. */
export async function createResetToken(email: string): Promise<string | null> {
  const identifier = resetIdentifier(email);
  const latest = await prisma.verificationToken.findFirst({
    where: { identifier },
    orderBy: { expires: "desc" },
  });
  if (latest && latest.expires.getTime() - RESET_TTL_MS > Date.now() - RESEND_COOLDOWN_MS) return null;

  const token = randomBytes(32).toString("base64url");
  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier } }),
    prisma.verificationToken.create({
      data: { identifier, token: hashToken(token), expires: new Date(Date.now() + RESET_TTL_MS) },
    }),
  ]);
  return token;
}

/** True when the token matches this email and has not expired. Does not consume it. */
export async function isResetTokenValid(email: string, token: string): Promise<boolean> {
  const row = await prisma.verificationToken.findUnique({
    where: { identifier_token: { identifier: resetIdentifier(email), token: hashToken(token) } },
  });
  return Boolean(row && row.expires.getTime() > Date.now());
}

export async function clearResetTokens(email: string): Promise<void> {
  await prisma.verificationToken.deleteMany({ where: { identifier: resetIdentifier(email) } });
}
