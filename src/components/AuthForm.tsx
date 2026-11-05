"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const isRegister = mode === "register";

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    const data = Object.fromEntries(new FormData(event.currentTarget));

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await response.json();

      if (!response.ok) {
        setError(json.error ?? "Something went wrong.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold tracking-tight">
        {isRegister ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-1.5 text-sm text-[var(--ink-3)]">
        {isRegister
          ? "Start practising in under a minute."
          : "Sign in to continue preparing."}
      </p>

      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        {isRegister && (
          <div>
            <label className="label" htmlFor="name">
              Full name
            </label>
            <input id="name" name="name" required className="input" autoComplete="name" />
          </div>
        )}

        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="input"
            autoComplete="email"
          />
        </div>

        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={isRegister ? 8 : undefined}
            className="input"
            autoComplete={isRegister ? "new-password" : "current-password"}
          />
          {isRegister && (
            <p className="mt-1.5 text-xs text-[var(--ink-3)]">At least 8 characters.</p>
          )}
        </div>

        {isRegister && (
          <div>
            <label className="label" htmlFor="branch">
              Branch <span className="font-normal">(optional)</span>
            </label>
            <input
              id="branch"
              name="branch"
              className="input"
              placeholder="e.g. Computer Engineering"
            />
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-[var(--bad-text)] px-3 py-2 text-sm text-[var(--bad-text)]"
          >
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn btn-primary w-full">
          {busy
            ? isRegister
              ? "Creating account…"
              : "Signing in…"
            : isRegister
              ? "Create account"
              : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--ink-3)]">
        {isRegister ? "Already have an account? " : "New to Edusys? "}
        <Link
          href={isRegister ? "/login" : "/register"}
          className="font-semibold text-[var(--brand)]"
        >
          {isRegister ? "Sign in" : "Create one"}
        </Link>
      </p>
    </div>
  );
}
