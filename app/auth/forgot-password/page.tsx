"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/components/marketing/auth-shell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) setError(data?.error ?? "Something went wrong. Please try again.");
      else setSent(true);
    } catch {
      setError("We could not reach GrantFlow. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a link to choose a new one."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/auth/login" className="font-semibold text-[#00ec95] underline">
            Back to log in
          </Link>
        </>
      }
    >
      {sent ? (
        <div className="flex items-start gap-2 bg-green-50 text-stamp-green border border-green-200 rounded-md px-3 py-3 text-sm" role="status">
          <CheckCircle size={16} className="shrink-0 mt-0.5" />
          <span>
            If an account exists for <strong>{email.trim().toLowerCase()}</strong>, a reset link is on its way. Check your inbox and spam folder. The link works for 1 hour.
          </span>
        </div>
      ) : (
        <>
          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-md px-3 py-2.5 text-sm mb-4" role="alert">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input label="Email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.org" />
            <Button type="submit" loading={loading} className="w-full mt-1 h-11 bg-[#00ec95] font-bold text-[#002319] hover:bg-[#65ffbe] focus-visible:ring-[#00ec95]">
              Send reset link
            </Button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
