/**
 * Reminder email preference
 * PATCH — turn reminder emails on or off for the signed-in user
 * POST  — send the signed-in user a test email (to confirm email is set up)
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db/prisma";
import { z } from "zod";
import { appUrl, isEmailConfigured, sendEmail } from "@/lib/email/send";

const Body = z.object({ emailReminders: z.boolean() });

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { emailReminders: parsed.data.emailReminders },
  });
  return NextResponse.json({ success: true, emailReminders: parsed.data.emailReminders });
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "Email is not set up on the server yet (RESEND_API_KEY and EMAIL_FROM)." },
      { status: 503 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const result = await sendEmail({
    to: user.email,
    subject: "GrantFlow test email",
    text: `This is a test from GrantFlow. Reminder emails will arrive at this address.\n\n${appUrl("/settings")}`,
    html: `<p>This is a test from GrantFlow. Reminder emails will arrive at this address.</p><p><a href="${appUrl("/settings")}">Reminder settings</a></p>`,
  });

  if (!result.sent) {
    return NextResponse.json({ error: "The email service rejected the test message. Check the sender address." }, { status: 502 });
  }
  return NextResponse.json({ success: true, to: user.email });
}
