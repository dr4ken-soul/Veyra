"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error?.message || "Sign in failed. Check the access code and try again.");
      router.replace(nextPath);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign in failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="login-form" onSubmit={submit}>
      <label className="field-label" htmlFor="access-code">Local workspace access code</label>
      <input
        id="access-code"
        className="text-input"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        aria-describedby="access-code-help access-code-error"
      />
      <p className="field-help" id="access-code-help">On this machine, read APP_LOGIN_PASSWORD from the private .env file in the project folder.</p>
      {error && <p className="field-error" id="access-code-error" role="alert">{error}</p>}
      <button className="button button-primary full-width" type="submit" disabled={loading}>
        {loading ? "Checking your session" : "Sign in"}
      </button>
    </form>
  );
}