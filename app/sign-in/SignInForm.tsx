"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";

/**
 * Real Supabase auth, replacing the prototype's simulated sign-in.
 *
 * Client-side validation runs first so an obvious typo does not cost a round
 * trip - but it is a courtesy, not a gate: the server decides.
 */
export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"password" | "google" | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !email.includes("@")) {
      setError("Enter the email tied to your Upforce workspace.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setBusy("password");
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setBusy(null);
      /* Supabase says "Invalid login credentials" for both a wrong password
         and an unknown address, which is the right thing to tell a stranger -
         pass it through rather than guessing which one it was. */
      setError(signInError.message);
      return;
    }

    router.replace("/today");
    router.refresh();
  }

  async function withGoogle() {
    setError("");
    setBusy("google");

    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    if (oauthError) {
      setBusy(null);
      setError(oauthError.message);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <label style={labelStyle} htmlFor="email">
        Work email
      </label>
      <input
        id="email"
        className="upf-input upf-input-lg"
        type="email"
        autoComplete="email"
        placeholder="jordan@upforcehub.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          marginTop: 14,
          marginBottom: 6,
        }}
      >
        <label style={{ ...labelStyle, marginBottom: 0 }} htmlFor="password">
          Password
        </label>
        <a
          href="/auth/forgot"
          style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 500 }}
        >
          Forgot?
        </a>
      </div>
      <input
        id="password"
        className="upf-input upf-input-lg"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          margin: "14px 0",
          fontSize: 13,
          color: "var(--t38)",
          cursor: "pointer",
        }}
      >
        <input
          className="upf-checkbox"
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
        />
        Keep me signed in on this device
      </label>

      {error ? (
        <p className="upf-error" style={{ margin: "0 0 14px" }} role="alert">
          {error}
        </p>
      ) : null}

      <button
        className="upf-btn upf-btn-primary"
        style={{ width: "100%" }}
        type="submit"
        disabled={busy !== null}
      >
        {busy === "password" ? "Signing in…" : "Sign in"}
      </button>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          margin: "18px 0",
        }}
      >
        <span style={{ flex: 1, borderTop: "1px solid var(--t19)" }} />
        <span
          className="upf-mono"
          style={{
            fontSize: 10.5,
            letterSpacing: ".12em",
            color: "var(--t34)",
          }}
        >
          OR
        </span>
        <span style={{ flex: 1, borderTop: "1px solid var(--t19)" }} />
      </div>

      <button
        className="upf-btn upf-btn-ghost"
        style={{ width: "100%", height: 44, borderRadius: 11, fontSize: 14 }}
        type="button"
        onClick={withGoogle}
        disabled={busy !== null}
      >
        {busy === "google" ? "Opening Google…" : "Continue with Google"}
      </button>
    </form>
  );
}

const labelStyle = {
  display: "block",
  marginBottom: 6,
  fontSize: 12.5,
  fontWeight: 500,
  color: "var(--t38)",
} as const;
