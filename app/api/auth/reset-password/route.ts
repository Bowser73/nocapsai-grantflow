import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { clearResetTokens, isResetTokenValid } from "@/lib/auth/password-reset";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  token: z.string().min(20).max(200),
  password: z.string().min(8).max(128),
});

const EXPIRED = "This reset link has expired or was already used. Request a new one.";

export async function POST(req: NextRequest) {
  let input: z.infer<typeof schema>;
  try {
    input = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Your new password must be at least 8 characters." }, { status: 400 });
  }

  try {
    if (!(await isResetTokenValid(input.email, input.token))) {
      return NextResponse.json({ error: EXPIRED }, { status: 400 });
    }
    const user = await prisma.user.findFirst({
      where: { email: { equals: input.email, mode: "insensitive" } },
      select: { id: true },
    });
    if (!user) {
      await clearResetTokens(input.email);
      return NextResponse.json({ error: EXPIRED }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    await clearResetTokens(input.email); // one use only

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[reset-password] error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
