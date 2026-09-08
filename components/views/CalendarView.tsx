"use client";

import { useMemo, useState } from "react";

import { useHub } from "@/components/HubStore";
import { SectionCard } from "@/components/ui";
import { useDerivedLeads } from "@/components/useDerived";
import { ink } from "@/lib/engine";
import { STAGES } from "@/lib/stages";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Monday of the current week, at local midnight. */
function weekStart(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  // getDay() is Sunday-first; shift so Monday is 0.
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

type GridItem =
  | { kind: "meeting" | "internal"; id: string; time: string; title: string; leadId: string | null }
  | { kind: "touch"; id: string; time: string; title: string; leadId: string; color: string };

export function CalendarView() {
  const { ws, calendar, select, notify, theme } = useHub();
  const leads = useDerivedLeads();

  const [booking, setBooking] = useState<number | null>(null);

  const start = useMemo(() => weekStart(), []);

  /**
   * Scheduled touches are placed on the grid alongside real meetings.
   *
   * They are not bookings - nobody agreed to them - which is why they carry
   * the lead's stage colour rather than the accent, and clicking one opens the
   * lead instead of a meeting.
   */
  const byDay = useMemo(() => {
    const columns: GridItem[][] = DAYS.map(() => []);

    for (const meeting of ws.meetings) {
      columns[meeting.day]?.push({
        kind: meeting.kind,
        id: meeting.id,
        time: meeting.time,
        title: meeting.title,
        leadId: meeting.leadId,
      });
    }

    for (const lead of leads) {
      if (lead.step.dueIn === null) continue;

      // Only this week's column. Overdue touches belong on Today, not here.
      const due = new Date();
      due.setHours(0, 0, 0, 0);
      due.setDate(due.getDate() + lead.step.dueIn);

      const column = Math.round(
        (due.getTime() - start.getTime()) / 86_400_000
      );
      if (column < 0 || column > 6) continue;

      columns[column].push({
        kind: "touch",
        id: `touch-${lead.id}`,
        time: "—",
        title: `${lead.name} · ${lead.step.label}`,
        leadId: lead.id,
        color: STAGES[lead.stage].color,
      });
    }

    for (const column of columns) column.sort((a, b) => a.time.localeCompare(b.time));
    return columns;
  }, [ws.meetings, leads, start]);

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(`https://${ws.teamShare.url}`);
      notify("Share link copied");
    } catch {
      // Clipboard access is blocked in some contexts; say so rather than
      // pretending the copy worked.
      notify("Could not reach the clipboard — copy it manually.");
    }
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          <SectionCard title="Connected accounts">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ws.calendarAccounts.map((account) => (
                <label
                  key={account.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    borderRadius: 11,
                    background: "var(--t6)",
                    border: "1px solid var(--t19)",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={account.connected}
                    onChange={(e) =>
                      calendar.setAccount(account.id, e.target.checked)
                    }
                    style={{
                      position: "absolute",
                      width: 1,
                      height: 1,
                      opacity: 0,
                      pointerEvents: "none",
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                      {account.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--t35)",
                        marginTop: 2,
                      }}
                    >
                      {account.connected ? account.detail : "Not connected"}
                    </div>
                  </div>

                  <span
                    className="upf-pill"
                    style={{
                      marginLeft: "auto",
                      color: account.connected
                        ? ink("#3FBF7F", theme)
                        : "var(--t35)",
                      background: account.connected
                        ? "rgba(63,191,127,.12)"
                        : "var(--t8)",
                      borderColor: account.connected
                        ? "rgba(63,191,127,.28)"
                        : "var(--t19)",
                    }}
                  >
                    {account.connected ? "Connected" : "Connect"}
                  </span>
                </label>
              ))}
            </div>
          </SectionCard>
        </div>

        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          <SectionCard title="Team calendar">
            <div style={{ display: "flex", gap: 7 }}>
              <input
                className="upf-input"
                readOnly
                value={ws.teamShare.url}
                aria-label="Team calendar share link"
              />
              <button
                className="upf-btn"
                type="button"
                onClick={copyShareLink}
                style={{ flex: "0 0 auto" }}
              >
                Copy
              </button>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 12,
              }}
            >
              <div style={{ display: "flex", gap: 4 }}>
                {[true, false].map((shared) => (
                  <button
                    key={String(shared)}
                    type="button"
                    onClick={() => calendar.setShared(shared)}
                    aria-pressed={ws.teamShare.shared === shared}
                    className="upf-focus"
                    style={{
                      padding: "5px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 16,
                      color:
                        ws.teamShare.shared === shared
                          ? "var(--ta)"
                          : "var(--t35)",
                      background:
                        ws.teamShare.shared === shared
                          ? "var(--t14)"
                          : "var(--t6)",
                      border: `1px solid ${
                        ws.teamShare.shared === shared
                          ? "var(--t25)"
                          : "var(--t19)"
                      }`,
                    }}
                  >
                    {shared ? "Shared" : "Private"}
                  </button>
                ))}
              </div>

              <span style={{ fontSize: 12, color: "var(--t35)" }}>
                {ws.teamShare.shared
                  ? "Anyone with the link can book time."
                  : "Only signed-in members can see this."}
              </span>
            </div>

            <div
              style={{
                marginTop: 14,
                padding: "11px 13px",
                borderRadius: 11,
                fontSize: 12.5,
                lineHeight: 1.55,
                color: "var(--ta)",
                background: "var(--t14)",
                border: "1px solid var(--t25)",
              }}
            >
              CadenceDock auto-books the retarget touches shown below into the
              first free slot on the day they come due.
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="upf-card upf-scroll-x" style={{ padding: 12 }}>
        <div style={{ display: "flex", gap: 10, minWidth: 840 }}>
          {DAYS.map((day, index) => {
            const date = new Date(start);
            date.setDate(date.getDate() + index);
            const isToday =
              date.toDateString() === new Date().toDateString();

            return (
              <div
                key={day}
                style={{
                  flex: "1 1 0",
                  minWidth: 118,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 6,
                    paddingBottom: 8,
                    borderBottom: `1px solid ${
                      isToday ? "var(--t25)" : "var(--t16)"
                    }`,
                  }}
                >
                  <span
                    className="upf-label"
                    style={{ color: isToday ? "var(--ta)" : undefined }}
                  >
                    {day}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--t34)" }}>
                    {date.getDate()}
                  </span>
                  <button
                    type="button"
                    onClick={() => setBooking(index)}
                    aria-label={`Book time on ${day}`}
                    style={{
                      marginLeft: "auto",
                      width: 22,
                      height: 22,
                      lineHeight: 1,
                      borderRadius: 7,
                      border: "1px solid var(--t21)",
                      background: "var(--t6)",
                      color: "var(--t37)",
                      fontSize: 13,
                    }}
                  >
                    +
                  </button>
                </div>

                {byDay[index].length === 0 ? (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: "var(--t33)",
                      padding: "6px 2px",
                    }}
                  >
                    Clear
                  </p>
                ) : (
                  byDay[index].map((item) => (
                    <GridCard
                      key={item.id}
                      item={item}
                      onOpenLead={(id) => select(id)}
                      onRemove={
                        item.kind === "touch"
                          ? undefined
                          : () => calendar.remove(item.id)
                      }
                    />
                  ))
                )}
              </div>
            );
          })}
        </div>
      </div>

      {booking !== null ? (
        <BookingModal day={booking} onClose={() => setBooking(null)} />
      ) : null}
    </>
  );
}

function GridCard({
  item,
  onOpenLead,
  onRemove,
}: {
  item: GridItem;
  onOpenLead: (leadId: string) => void;
  onRemove?: () => void;
}) {
  const accent =
    item.kind === "touch"
      ? item.color
      : item.kind === "internal"
        ? "var(--t31)"
        : "var(--ta)";

  const clickable = item.kind === "touch" || item.leadId !== null;

  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={() => {
        if (item.kind === "touch") onOpenLead(item.leadId);
        else if (item.leadId) onOpenLead(item.leadId);
      }}
      onKeyDown={(e) => {
        if (!clickable) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (item.kind === "touch") onOpenLead(item.leadId);
          else if (item.leadId) onOpenLead(item.leadId);
        }
      }}
      className="upf-hover-card upf-focus"
      style={{
        padding: "9px 10px",
        borderRadius: 10,
        background: "var(--t6)",
        border: "1px solid var(--t19)",
        borderLeft: `3px solid ${accent}`,
        cursor: clickable ? "pointer" : "default",
      }}
    >
      <div
        className="upf-mono"
        style={{ fontSize: 10.5, color: "var(--t34)" }}
      >
        {item.time}
      </div>
      <div
        style={{
          fontSize: 12.5,
          fontWeight: 500,
          color: "var(--t39)",
          marginTop: 3,
          lineHeight: 1.4,
        }}
      >
        {item.title}
      </div>

      {onRemove ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={{
            marginTop: 6,
            padding: 0,
            border: "none",
            background: "none",
            fontSize: 11.5,
            color: "var(--t34)",
          }}
        >
          Remove
        </button>
      ) : null}
    </div>
  );
}

function BookingModal({
  day,
  onClose,
}: {
  day: number;
  onClose: () => void;
}) {
  const { ws, calendar } = useHub();

  const [form, setForm] = useState({
    day,
    time: "10:00",
    title: "",
    kind: "meeting" as "meeting" | "internal",
    leadId: "" as string,
  });

  return (
    <div
      className="upf-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Book time"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="upf-card upf-pop"
        style={{ width: "100%", maxWidth: 440, boxShadow: "var(--shadow)" }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            padding: "14px 18px",
            borderBottom: "1px solid var(--t16)",
          }}
        >
          <h2
            className="upf-display"
            style={{ fontSize: 15, fontWeight: 600, margin: 0 }}
          >
            Book time
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
          <label className="upf-label" style={{ display: "block", marginBottom: 6 }}>
            Title
          </label>
          <input
            className="upf-input"
            autoFocus
            placeholder="Pricing call"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />

          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="upf-label" style={{ display: "block", marginBottom: 6 }}>
                Day
              </label>
              <select
                className="upf-input"
                value={form.day}
                onChange={(e) =>
                  setForm({ ...form, day: Number(e.target.value) })
                }
              >
                {DAYS.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <label className="upf-label" style={{ display: "block", marginBottom: 6 }}>
                Time
              </label>
              <input
                className="upf-input"
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              />
            </div>
          </div>

          <label
            className="upf-label"
            style={{ display: "block", margin: "12px 0 6px" }}
          >
            Attach to lead
          </label>
          <select
            className="upf-input"
            value={form.leadId}
            onChange={(e) => setForm({ ...form, leadId: e.target.value })}
          >
            <option value="">No lead</option>
            {ws.leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.name}
              </option>
            ))}
          </select>

          <label
            className="upf-label"
            style={{ display: "block", margin: "12px 0 6px" }}
          >
            Type
          </label>
          <select
            className="upf-input"
            value={form.kind}
            onChange={(e) =>
              setForm({
                ...form,
                kind: e.target.value as "meeting" | "internal",
              })
            }
          >
            <option value="meeting">Client meeting</option>
            <option value="internal">Internal</option>
          </select>
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
          <button
            className="upf-btn"
            type="button"
            onClick={() => {
              calendar.book({
                day: form.day,
                time: form.time,
                title: form.title,
                kind: form.kind,
                leadId: form.leadId || null,
              });
              onClose();
            }}
          >
            Book &amp; sync
          </button>
        </footer>
      </div>
    </div>
  );
}
