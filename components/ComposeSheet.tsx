"use client";

import { useEffect, useMemo, useState } from "react";

import { useHub } from "@/components/HubStore";
import { useDerivedLead } from "@/components/useDerived";
import { CALL_OUTCOMES, type Channel } from "@/lib/stages";

/**
 * Writes the touch, then logs it.
 *
 * The body is prefilled from the scheduled step so the rep is editing a draft
 * rather than facing an empty box - the whole point of the ladder is that the
 * system already knows what this touch is for.
 *
 * Nothing is actually sent: Hub records outreach, it does not deliver it. The
 * button says "Mark sent" for that reason.
 */
export function ComposeSheet({
  leadId,
  channel,
  onClose,
}: {
  leadId: string;
  channel: Channel;
  onClose: () => void;
}) {
  const { logTouch } = useHub();
  const lead = useDerivedLead(leadId);

  const draft = useMemo(() => {
    if (!lead) return { subject: "", body: "" };

    const first = lead.name.split(" ")[0];
    const step = lead.step.label;

    if (channel === "Email") {
      return {
        subject: `${step} — Upforce`,
        body:
          `Hey ${first},\n\n${step}. We handle the editing, thumbnails and ` +
          `daily posting so you can stay on camera — happy to send over a ` +
          `sample cut of your last upload.\n\nWorth a quick 15?\n\n— Upforce`,
      };
    }

    if (channel === "DM") {
      return {
        subject: "",
        body:
          `Hey ${first} — ${step.toLowerCase()}. We edit and manage channels ` +
          `like yours. Want me to send a free sample cut?`,
      };
    }

    return { subject: "", body: "" };
  }, [lead, channel]);

  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);
  const [outcome, setOutcome] = useState<string>(CALL_OUTCOMES[0]);

  useEffect(() => {
    setSubject(draft.subject);
    setBody(draft.body);
  }, [draft]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!lead) return null;

  function send() {
    const detail =
      channel === "Call"
        ? outcome
        : channel === "Email"
          ? subject
          : body.slice(0, 48) + (body.length > 48 ? "…" : "");

    logTouch(leadId, channel, detail);
    onClose();
  }

  return (
    <div
      className="upf-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Log ${channel} for ${lead.name}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="upf-card upf-pop"
        style={{ width: "100%", maxWidth: 520, boxShadow: "var(--shadow)" }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 18px",
            borderBottom: "1px solid var(--t16)",
          }}
        >
          <h2
            className="upf-display"
            style={{ fontSize: 15, fontWeight: 600, margin: 0 }}
          >
            {channel} · {lead.name}
          </h2>
          <button
            className="upf-btn upf-btn-ghost"
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ marginLeft: "auto", width: 32, padding: 0 }}
          >
            ✕
          </button>
        </header>

        <div style={{ padding: 18 }}>
          <p
            style={{
              margin: "0 0 14px",
              fontSize: 12.5,
              color: "var(--t35)",
            }}
          >
            Scheduled step: {lead.step.label}
          </p>

          {channel === "Email" ? (
            <>
              <label className="upf-label" style={{ display: "block", marginBottom: 6 }}>
                Subject
              </label>
              <input
                className="upf-input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={{ marginBottom: 12 }}
              />
            </>
          ) : null}

          {channel === "Call" ? (
            <>
              <label className="upf-label" style={{ display: "block", marginBottom: 6 }}>
                Outcome
              </label>
              <select
                className="upf-input"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
              >
                {CALL_OUTCOMES.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <>
              <label className="upf-label" style={{ display: "block", marginBottom: 6 }}>
                Message
              </label>
              <textarea
                className="upf-input"
                rows={8}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </>
          )}
        </div>

        <footer
          style={{
            display: "flex",
            gap: 8,
            padding: "0 18px 18px",
            justifyContent: "flex-end",
          }}
        >
          <button
            className="upf-btn upf-btn-ghost"
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="upf-btn" type="button" onClick={send}>
            {channel === "Call" ? "Log call" : `Mark ${channel.toLowerCase()} sent`}
          </button>
        </footer>
      </div>
    </div>
  );
}
