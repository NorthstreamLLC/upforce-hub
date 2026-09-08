"use client";

import { useMemo } from "react";

import { useHub } from "@/components/HubStore";
import {
  Avatar,
  DueDot,
  StageDot,
  TagChips,
  dueTextColor,
  riseDelay,
} from "@/components/ui";
import { useDerivedLeads, type DerivedLead } from "@/components/useDerived";
import { money } from "@/lib/engine";
import { STAGES, STAGE_ORDER, type StageId } from "@/lib/stages";

/**
 * The board.
 *
 * Six fixed columns rather than a drag-and-drop kanban: a stage change resets
 * a lead's retarget clock, which is too consequential to happen because a card
 * was dropped a column to the left. Moving a lead is a deliberate act in the
 * drawer.
 */
export function PipelineView() {
  const leads = useDerivedLeads();

  const byStage = useMemo(() => {
    const grouped = {} as Record<StageId, DerivedLead[]>;
    for (const stage of STAGE_ORDER) grouped[stage] = [];
    for (const lead of leads) grouped[lead.stage]?.push(lead);

    // Most urgent at the top of each column.
    for (const stage of STAGE_ORDER) {
      grouped[stage].sort(
        (a, b) => (a.step.dueIn ?? Infinity) - (b.step.dueIn ?? Infinity)
      );
    }
    return grouped;
  }, [leads]);

  return (
    <div className="upf-scroll-x">
      <div style={{ display: "flex", gap: 14, minWidth: 1200 }}>
        {STAGE_ORDER.map((stage) => (
          <Column key={stage} stage={stage} leads={byStage[stage]} />
        ))}
      </div>
    </div>
  );
}

function Column({ stage, leads }: { stage: StageId; leads: DerivedLead[] }) {
  const { ws } = useHub();
  const config = STAGES[stage];
  const cadence = ws.cadences[stage];

  /* Read the summary off the cadence that is actually configured rather than
     the static copy, so editing a ladder in Settings updates the header too. */
  const summary = cadence.steps.length
    ? `Day ${cadence.steps.map((s) => s.day).join(" · ")}${
        config.next ? `, then ${config.nextLabel} at ${cadence.demoteDay}` : ""
      }`
    : config.cadence;

  return (
    <section
      className="upf-panel"
      style={{
        flex: "1 1 0",
        minWidth: 240,
        display: "flex",
        flexDirection: "column",
        borderTop: `2px solid ${config.color}`,
      }}
    >
      <header style={{ padding: "12px 13px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <StageDot stage={stage} />
          <h2
            className="upf-display"
            style={{ fontSize: 13.5, fontWeight: 600, margin: 0 }}
          >
            {config.label}
          </h2>
          <span
            className="upf-mono"
            style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--t35)" }}
          >
            {leads.length}
          </span>
        </div>
        <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--t34)" }}>
          {summary}
        </p>
      </header>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 9,
          padding: "0 10px 12px",
        }}
      >
        {leads.length === 0 ? (
          <p
            style={{
              margin: 0,
              padding: "14px 4px",
              fontSize: 12.5,
              color: "var(--t34)",
            }}
          >
            Empty.
          </p>
        ) : (
          leads.map((lead, i) => (
            <PipelineCard key={lead.id} lead={lead} index={i} />
          ))
        )}
      </div>
    </section>
  );
}

function PipelineCard({ lead, index }: { lead: DerivedLead; index: number }) {
  const { select, theme } = useHub();
  const color = STAGES[lead.stage].color;

  return (
    <button
      type="button"
      onClick={() => select(lead.id)}
      className="upf-rise upf-hover-card upf-focus"
      style={{
        ...riseDelay(index, 45),
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "13px 13px 12px",
        borderRadius: 12,
        border: "1px solid var(--t19)",
        borderLeft: `3px solid ${color}`,
        background: "var(--t7)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar name={lead.name} color={color} size="md" />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {lead.name}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--t35)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {lead.handle}
            {lead.extraAccounts > 0 ? `  +${lead.extraAccounts}` : ""}
          </div>
        </div>
        <DueDot due={lead.due} />
      </div>

      <div
        style={{
          fontSize: 13.5,
          fontWeight: 500,
          color: "var(--t40)",
          margin: "10px 0 8px",
        }}
      >
        {lead.step.label}
      </div>

      {lead.tagIds.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 5,
            marginBottom: 10,
          }}
        >
          <TagChips tagIds={lead.tagIds} />
        </div>
      ) : null}

      <div
        className="upf-divider"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          paddingTop: 9,
        }}
      >
        <span
          className="upf-mono"
          style={{ fontSize: 11, color: dueTextColor(lead.due, theme) }}
        >
          {lead.due.text}
        </span>
        <span
          className="upf-mono"
          style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--t36)" }}
        >
          {money(lead.mrrCents)}
        </span>
      </div>
    </button>
  );
}
