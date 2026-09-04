"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui";
import { cn } from "@/lib/utils";

type SignInFormProps = {
  initialError?: string | null;
};

export function SignInForm({ initialError = null }: SignInFormProps) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialError);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setError(null);

    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") || "/shoot";
      const response = await fetch(`${basePath}/api/auth/magic-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !payload.ok) {
        setError(payload.message ?? "Something went wrong. Please try again later.");
      } else {
        setMessage(payload.message ?? "Check your email for a secure sign-in link.");
      }
    } catch {
      setError("Something went wrong. Please try again later.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-4" aria-label="Parent sign-in">
      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">Parent email</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={cn(
            "min-h-11 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange",
          )}
          placeholder="parent@schooldistrict.org"
        />
      </label>
      <p className="text-sm text-muted">
        Use the parent email entered on your Shooting Challenge registration.
      </p>
      <Button type="submit" disabled={pending} className="min-h-11 w-full">
        {pending ? "Sending secure link…" : "Email me a secure sign-in link"}
      </Button>
      {message ? (
        <p className="rounded-md border border-border bg-card px-3 py-0.5 text-sm text-foreground" role="status">
          {message}
        </p>
      ) : null}
      {error ? <ErrorState title="Sign-in unavailable" message={error} /> : null}
    </form>
  );
}
