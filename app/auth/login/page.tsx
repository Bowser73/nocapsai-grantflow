"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/components/marketing/auth-shell";

// Inner component isolated so Suspense can wrap useSearchParams safely
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const justRegistered = searchParams.get("registered") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Normalize email to match how it is stored/looked up server-side
    // (the authorize callback trims + lowercases before the DB lookup).
    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error === "CredentialsSignin") {
        setError("Invalid email or password.");
      } else if (!result || result.error || !result.ok) {
        setError("Sign-in is temporarily unavailable. Please try again shortly.");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("Unable to reach the sign-in service. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {justRegistered && !error && (
        <div className="flex items-center gap-2 bg-green-50 text-stamp-green border border-green-200 rounded-md px-3 py-2.5 text-sm mb-4">
          <CheckCircle size={16} className="shrink-0" />
          Your account is ready. Log in to set up your organization.
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-md px-3 py-2.5 text-sm mb-4">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="you@example.org"
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          placeholder="••••••••"
        />
        <Button type="submit" loading={loading} className="w-full mt-1">
          Log in
        </Button>
      </form>
    </>
  );
}

export default function LoginPage() {
  return (
    <AuthShell
      title="Log in"
      subtitle="Pick up where you left off."
      footer={
        <>
          New to GrantFlow?{" "}
          <Link href="/auth/register" className="font-semibold text-brand-800 underline">
            Create a free account
          </Link>
        </>
      }
    >
      <Suspense
        fallback={
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
