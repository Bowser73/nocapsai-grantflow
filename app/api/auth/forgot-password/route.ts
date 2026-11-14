import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { createResetToken } from "@/lib/auth/password-reset";
import { appUrl, escapeHtml, isEmailConfigured, sendEmail } from "@/lib/email/send";

const schema = z.object({ email: z.string().trim().toLowerCase().email() });

// Same answer whether or not the account exists, so this can't be used to
// find out who has a GrantFlow account.
const OK = { success: true, message: "If an account exists for that email, a reset link is on its way." };

export async function POST(req: NextRequest) {
  let email: string;
  try {
    ({ email } = schema.parse(await req.json()));
  } catch {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (!isEmailConfigured()) {
    console.error("[forgot-password] RESEND_API_KEY / EMAIL_FROM not set; cannot send reset email.");
    return NextResponse.json(
      { error: "Password reset email isn't available right now. Please email info@nocapsai.com for help." },
      { status: 503 }
    );
  }

  try {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { name: true, passwordHash: true },
    });
    if (!user?.passwordHash) return NextResponse.json(OK);

    const token = await createResetToken(email);
    if (!token) return NextResponse.json(OK); // a link was sent moments ago

    const link = appUrl(`/auth/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`);
    const first = user.name ? user.name.trim().split(/\s+/)[0] : "";
    const helloText = first ? `Hi ${first},` : "Hi,";
    const hello = first ? `Hi ${escapeHtml(first)},` : "Hi,";
    const result = await sendEmail({
      to: email,
      subject: "Reset your GrantFlow password",
      text: `${helloText}\n\nSomeone asked to reset the password for your GrantFlow account. Use this link within 1 hour to choose a new one:\n\n${link}\n\nIf you didn't ask for this, you can ignore this email; your password won't change.\n\nGrantFlow by NoCapsAI`,
      html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:auto;color:#0c1630">
  <p style="color:#00a96b;font-weight:700;letter-spacing:.1em;font-size:12px;text-transform:uppercase">GrantFlow by NoCapsAI</p>
  <h1 style="font-size:22px">Reset your password</h1>
  <p>${hello}</p>
  <p>Someone asked to reset the password for your GrantFlow account. Use the button below within 1 hour to choose a new one.</p>
  <p style="margin:28px 0"><a href="${escapeHtml(link)}" style="background:#00ec95;color:#002319;font-weight:700;padding:12px 22px;border-radius:7px;text-decoration:none">Choose a new password</a></p>
  <p style="font-size:13px;color:#555">If you didn't ask for this, you can ignore this email. Your password won't change.</p>
</div>`,
    });
    if (!result.sent) console.error("[forgot-password] reset email not sent:", result.reason, result.detail ?? "");
    return NextResponse.json(OK);
  } catch (error) {
    console.error("[forgot-password] error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
