"use client";

import { useState, type FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !email.includes("@")) {
      setError("Enter the email tied to your Upforce workspace.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: `${window.location.origin}/auth/callback` }
    );
    setBusy(false);

    /* Report success either way. Saying "no account with that email" turns
       this form into a way to test which addresses are on the workspace. */
    if (resetError && resetError.status !== 400) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <p style={{ fontSize: 13.5, color: "var(--t38)", lineHeight: 1.6 }}>
        If that address is on the workspace, a reset link is on its way. It
        expires in an hour.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <input
        className="upf-input upf-input-lg"
        type="email"
        autoComplete="email"
        placeholder="jordan@upforcehub.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-label="Work email"
      />

      {error ? (
        <p className="upf-error" style={{ margin: "14px 0 0" }} role="alert">
          {error}
        </p>
      ) : null}

      <button
        className="upf-btn upf-btn-primary"
        style={{ width: "100%", marginTop: 14 }}
        type="submit"
        disabled={busy}
      >
        {busy ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
