"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/components/marketing/auth-shell";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!email || !token) {
    return (
      <div className="text-sm text-gray-700">
        This reset link is incomplete.{" "}
        <Link href="/auth/forgot-password" className="font-semibold text-[#00a96b] underline">Request a new link</Link>.
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Something went wrong. Please try again.");
        setLoading(false);
      } else {
        router.push("/auth/login?reset=1");
      }
    } catch {
      setError("We could not reach GrantFlow. Check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <p className="text-sm text-gray-600 mb-4">
        Choosing a new password for <strong className="text-gray-900">{email}</strong>
      </p>
      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-md px-3 py-2.5 text-sm mb-4" role="alert">
          <AlertCircle size={16} className="shrink-0" />
          <span>
            {error}{" "}
            {error.includes("expired") && (
              <Link href="/auth/forgot-password" className="font-semibold underline">Get a new link</Link>
            )}
          </span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="New password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
        <Input label="Confirm new password" type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Type it again" />
        <Button type="submit" loading={loading} className="w-full mt-1 h-11 bg-[#00ec95] font-bold text-[#002319] hover:bg-[#65ffbe] focus-visible:ring-[#00ec95]">
          Save new password
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Pick something you'll remember. At least 8 characters."
      footer={
        <>
          Back to{" "}
          <Link href="/auth/login" className="font-semibold text-[#00ec95] underline">
            log in
          </Link>
        </>
      }
    >
      <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-brand-400" /></div>}>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
