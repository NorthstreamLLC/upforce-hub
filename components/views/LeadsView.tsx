"use client";

import { useMemo, useState } from "react";

import { useHub } from "@/components/HubStore";
import {
  Avatar,
  DueChip,
  EmptyState,
  StagePill,
  TagChips,
  riseDelay,
} from "@/components/ui";
import { useDerivedLeads, type DerivedLead } from "@/components/useDerived";
import { ink, money } from "@/lib/engine";
import { STAGES, STAGE_ORDER, type StageId } from "@/lib/stages";

/**
 * The full table.
 *
 * Filters are additive across kinds and exclusive within one: a stage plus a
 * tag narrows, a second stage replaces the first. Multi-select on both axes
 * reads as a query builder, which is not what this screen is for.
 */
export function LeadsView() {
  const { ws, select, theme } = useHub();
  const leads = useDerivedLeads();

  const [stageFilter, setStageFilter] = useState<StageId | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      leads.filter(
        (l) =>
          (!stageFilter || l.stage === stageFilter) &&
          (!tagFilter || l.tagIds.includes(tagFilter))
      ),
    [leads, stageFilter, tagFilter]
  );

  /* The mix bar reads the unfiltered set on purpose - it is the shape of the
     whole pipeline, and would be a meaningless single block if it narrowed
     with the filter chips below it. */
  const mix = useMemo(
    () =>
      STAGE_ORDER.map((stage) => ({
        stage,
        count: leads.filter((l) => l.stage === stage).length,
      })).filter((s) => s.count > 0),
    [leads]
  );

  const totalValue = useMemo(
    () => leads.reduce((sum, l) => sum + l.mrrCents, 0),
    [leads]
  );

  return (
    <>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "stretch",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div className="upf-card" style={{ flex: "1 1 140px", padding: "15px 16px" }}>
          <div className="upf-label">Total leads</div>
          <div
            className="upf-display"
            style={{ fontSize: 26, fontWeight: 600, marginTop: 6 }}
          >
            {leads.length}
          </div>
        </div>

        <div
          className="upf-card"
          style={{
            flex: "2 1 200px",
            minWidth: 0,
            padding: "15px 16px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div className="upf-label">Pipeline mix</div>

          <div
            style={{
              display: "flex",
              height: 10,
              borderRadius: 5,
              overflow: "hidden",
              margin: "10px 0",
              background: "var(--t8)",
            }}
          >
            {mix.map((segment) => (
              <span
                key={segment.stage}
                className="upf-bar"
                title={`${STAGES[segment.stage].label}: ${segment.count}`}
                style={{
                  flex: `${segment.count} 1 0`,
                  background: STAGES[segment.stage].color,
                }}
              />
            ))}
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginTop: "auto",
            }}
          >
            {mix.map((segment) => (
              <span
                key={segment.stage}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 11.5,
                  color: "var(--t35)",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: STAGES[segment.stage].color,
                  }}
                />
                {STAGES[segment.stage].label} {segment.count}
              </span>
            ))}
          </div>
        </div>

        <div className="upf-card" style={{ flex: "1 1 150px", padding: "15px 16px" }}>
          <div className="upf-label">Total value</div>
          <div
            className="upf-display"
            style={{
              fontSize: 26,
              fontWeight: 600,
              marginTop: 6,
              color: ink("#3FBF7F", theme),
            }}
          >
            {money(totalValue)}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--t36)", marginTop: 4 }}>
            per month across every stage
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 8 }}>
        <FilterChip
          active={stageFilter === null}
          onClick={() => setStageFilter(null)}
        >
          All stages
        </FilterChip>
        {STAGE_ORDER.map((stage) => (
          <FilterChip
            key={stage}
            active={stageFilter === stage}
            color={STAGES[stage].color}
            onClick={() => setStageFilter(stageFilter === stage ? null : stage)}
          >
            {STAGES[stage].label}
          </FilterChip>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 16 }}>
        <FilterChip active={tagFilter === null} onClick={() => setTagFilter(null)}>
          All tags
        </FilterChip>
        {ws.tags.map((tag) => (
          <FilterChip
            key={tag.id}
            active={tagFilter === tag.id}
            color={tag.color}
            onClick={() => setTagFilter(tagFilter === tag.id ? null : tag.id)}
          >
            {tag.name}
          </FilterChip>
        ))}
      </div>

      <div className="upf-card upf-scroll-x">
        <div
          className="upf-leads-grid upf-label"
          style={{ padding: "11px 16px", borderBottom: "1px solid var(--t16)" }}
        >
          <span>Lead</span>
          <span>Platform</span>
          <span>Stage</span>
          <span>Next action</span>
          <span>Due</span>
          <span style={{ textAlign: "right" }}>MRR</span>
        </div>

        {filtered.length === 0 ? (
          <EmptyState>No leads match those filters.</EmptyState>
        ) : (
          filtered.map((lead, i) => (
            <Row
              key={lead.id}
              lead={lead}
              index={i}
              onOpen={() => select(lead.id)}
            />
          ))
        )}
      </div>
    </>
  );
}

function Row({
  lead,
  index,
  onOpen,
}: {
  lead: DerivedLead;
  index: number;
  onOpen: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="upf-leads-grid upf-table-row upf-rise upf-focus"
      style={{
        /* Only the first screenful staggers. Animating row 60 means a table
           that is still assembling itself long after it is readable. */
        ...(index < 14 ? riseDelay(index, 28) : { animation: "none" }),
        alignItems: "center",
        padding: "14px 16px",
        borderBottom: "1px solid var(--t16)",
        cursor: "pointer",
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}
      >
        <Avatar name={lead.name} color={STAGES[lead.stage].color} size="table" />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600 }}>{lead.name}</div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexWrap: "wrap",
              fontSize: 12,
              color: "var(--t35)",
              marginTop: 2,
            }}
          >
            <span>{lead.handle}</span>
            <TagChips tagIds={lead.tagIds} />
          </div>
        </div>
      </div>

      <div style={{ fontSize: 13, color: "var(--t37)", minWidth: 0 }}>
        {lead.platform}
        {lead.extraAccounts > 0 ? (
          <span style={{ color: "var(--t34)" }}> +{lead.extraAccounts}</span>
        ) : null}
      </div>

      <div>
        <StagePill stage={lead.stage} />
      </div>

      <div
        style={{
          fontSize: 13.5,
          fontWeight: 500,
          color: "var(--t40)",
          minWidth: 0,
        }}
      >
        {lead.step.label}
      </div>

      <div>
        <DueChip due={lead.due} />
      </div>

      <div
        className="upf-mono"
        style={{ fontSize: 12, color: "var(--t37)", textAlign: "right" }}
      >
        {money(lead.mrrCents)}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const { theme } = useHub();
  const hue = color ?? "#E9A83B";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="upf-focus"
      style={{
        padding: "5px 12px",
        fontSize: 12.5,
        fontWeight: 500,
        borderRadius: 18,
        whiteSpace: "nowrap",
        color: active ? ink(hue, theme) : "var(--t36)",
        background: active ? `${hue}14` : "var(--t6)",
        border: `1px solid ${active ? `${hue}55` : "var(--t19)"}`,
        transition: "background .16s ease, border-color .16s ease, color .16s ease",
      }}
    >
      {children}
    </button>
  );
}
