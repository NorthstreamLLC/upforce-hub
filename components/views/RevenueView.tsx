"use client";

import Link from "next/link";
import { useMemo } from "react";

import { useHub } from "@/components/HubStore";
import { SectionCard, StatCard } from "@/components/ui";
import { useDerivedLeads, type DerivedLead } from "@/components/useDerived";
import { ink, money } from "@/lib/engine";
import { STAGES, STAGE_ORDER } from "@/lib/stages";

/**
 * What the pipeline is worth. Totals only.
 *
 * The rate card - which package costs what, which add-ons a lead carries - is
 * configuration, and it lives in Settings where it is edited. Restating it
 * here would put prices in two places, and two places eventually disagree.
 *
 * Active MRR is booked revenue from converted clients. Pipeline MRR is
 * everything still live, at full value, with no probability weighting: what is
 * on the table, not a guess at what will land.
 */
export function RevenueView() {
  const { ws, theme } = useHub();
  const leads = useDerivedLeads();

  const totals = useMemo(() => {
    const converted = leads.filter((l) => l.stage === "converted");
    const dead = leads.filter((l) => l.stage === "dead");
    const inPipe = leads.filter(
      (l) => l.stage !== "converted" && l.stage !== "dead"
    );

    const activeMrr = sum(converted);
    const closed = converted.length + dead.length;

    return {
      activeMrr,
      pipelineMrr: sum(inPipe),
      avgDeal: converted.length ? activeMrr / converted.length : 0,
      winRate: closed ? converted.length / closed : 0,
      convertedCount: converted.length,
    };
  }, [leads]);

  const byStage = useMemo(
    () =>
      STAGE_ORDER.filter((s) => s !== "converted" && s !== "dead").map(
        (stage) => {
          const inStage = leads.filter((l) => l.stage === stage);
          return { stage, count: inStage.length, value: sum(inStage) };
        }
      ),
    [leads]
  );

  /* Product mix. No price column - that is the rate card, and it lives in
     Settings. What this answers is which tiers people actually buy. */
  const byPackage = useMemo(
    () =>
      ws.packages
        .map((pkg) => {
          const on = leads.filter((l) => l.packageId === pkg.id);
          const clients = on.filter((l) => l.stage === "converted");
          return {
            id: pkg.id,
            name: pkg.name,
            clients: clients.length,
            inPipe: on.filter(
              (l) => l.stage !== "converted" && l.stage !== "dead"
            ).length,
            mrr: sum(clients),
          };
        })
        .sort((a, b) => b.mrr - a.mrr || b.clients - a.clients),
    [leads, ws.packages]
  );

  /* Every add-on, including the ones nobody has taken - a zero row is the
     signal that a line item is not selling, which disappears if we filter it
     out. Doubly useful while the eight prices are still unset: this says which
     to price first. */
  const byAddon = useMemo(
    () =>
      ws.addons
        .map((addon) => ({
          id: addon.id,
          name: addon.name,
          priced: addon.priceCents > 0,
          attached: leads.filter((l) => l.addonIds.includes(addon.id)).length,
        }))
        .sort((a, b) => b.attached - a.attached),
    [leads, ws.addons]
  );

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 12,
          marginBottom: 22,
        }}
      >
        <StatCard
          label="Active MRR"
          value={money(totals.activeMrr)}
          note={`${totals.convertedCount} managed ${
            totals.convertedCount === 1 ? "client" : "clients"
          }`}
          tone="#3FBF7F"
        />
        <StatCard
          label="Pipeline MRR"
          value={money(totals.pipelineMrr)}
          note="everything live, at full value"
          tone="#E9A83B"
        />
        <StatCard
          label="Avg deal"
          value={money(totals.avgDeal)}
          note="per client"
        />
        <StatCard
          label="Win rate"
          value={`${Math.round(totals.winRate * 100)}%`}
          note="converted vs closed"
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <SectionCard title="Month by month" bodyStyle={{ padding: 0 }}>
          {ws.history.length === 0 ? (
            <p
              style={{
                margin: 0,
                padding: 18,
                fontSize: 13,
                color: "var(--t35)",
                lineHeight: 1.6,
              }}
            >
              No months closed yet. A snapshot is taken automatically at 00:05
              UTC on the 1st, freezing the month that just ended — so the first
              row appears once this month rolls over.
            </p>
          ) : (
            <div className="upf-scroll-x">
              <table
                style={{
                  width: "100%",
                  minWidth: 640,
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr>
                    {["Month", "Active MRR", "Pipeline MRR", "Won", "Lost", "Net"].map(
                      (heading, i) => (
                        <th
                          key={heading}
                          className="upf-label"
                          style={{
                            padding: "11px 16px",
                            textAlign: i === 0 ? "left" : "right",
                            borderBottom: "1px solid var(--t16)",
                            fontWeight: 400,
                          }}
                        >
                          {heading}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {ws.history.map((row, i) => {
                    /* History is newest-first, so the previous month is the
                       NEXT row, not the one above it. */
                    const previous = ws.history[i + 1];
                    const delta = previous
                      ? row.activeMrrCents - previous.activeMrrCents
                      : null;
                    const net = row.wonCount - row.lostCount;

                    return (
                      <tr key={row.month}>
                        <td style={cell}>{monthLabel(row.month)}</td>
                        <td style={{ ...cell, ...numeric }}>
                          <span
                            style={{
                              display: "flex",
                              alignItems: "baseline",
                              gap: 8,
                              justifyContent: "flex-end",
                            }}
                          >
                            {money(row.activeMrrCents)}
                            {delta !== null && delta !== 0 ? (
                              <span
                                style={{
                                  fontSize: 11,
                                  color:
                                    delta > 0
                                      ? ink("#3FBF7F", theme)
                                      : ink("#F2683C", theme),
                                }}
                              >
                                {delta > 0 ? "+" : "−"}
                                {money(Math.abs(delta))}
                              </span>
                            ) : null}
                          </span>
                        </td>
                        <td style={{ ...cell, ...numeric }}>
                          {money(row.pipelineMrrCents)}
                        </td>
                        <td
                          style={{
                            ...cell,
                            ...numeric,
                            color: row.wonCount
                              ? ink("#3FBF7F", theme)
                              : undefined,
                          }}
                        >
                          {row.wonCount}
                        </td>
                        <td
                          style={{
                            ...cell,
                            ...numeric,
                            color: row.lostCount
                              ? ink("#F2683C", theme)
                              : undefined,
                          }}
                        >
                          {row.lostCount}
                        </td>
                        <td style={{ ...cell, ...numeric }}>
                          {net > 0 ? `+${net}` : net}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          <div style={{ flex: "1 1 340px", minWidth: 0 }}>
            <SectionCard title="Packages" bodyStyle={{ padding: 0 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Package", "Clients", "In pipe", "MRR"].map((h, i) => (
                      <th
                        key={h}
                        className="upf-label"
                        style={{
                          padding: "11px 16px",
                          textAlign: i === 0 ? "left" : "right",
                          borderBottom: "1px solid var(--t16)",
                          fontWeight: 400,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {byPackage.map((row) => (
                    <tr key={row.id}>
                      <td style={cell}>{row.name}</td>
                      <td style={{ ...cell, ...numeric }}>{row.clients}</td>
                      <td style={{ ...cell, ...numeric }}>{row.inPipe}</td>
                      <td style={{ ...cell, ...numeric }}>{money(row.mrr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SectionCard>
          </div>

          <div style={{ flex: "1 1 340px", minWidth: 0 }}>
            <SectionCard title="Add-on attach" bodyStyle={{ padding: 0 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Add-on", "Leads"].map((h, i) => (
                      <th
                        key={h}
                        className="upf-label"
                        style={{
                          padding: "11px 16px",
                          textAlign: i === 0 ? "left" : "right",
                          borderBottom: "1px solid var(--t16)",
                          fontWeight: 400,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {byAddon.map((row) => (
                    <tr key={row.id}>
                      <td style={cell}>
                        {row.name}
                        {!row.priced ? (
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: 11,
                              color: "var(--t34)",
                            }}
                          >
                            no price set
                          </span>
                        ) : null}
                      </td>
                      <td style={{ ...cell, ...numeric }}>{row.attached}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SectionCard>
          </div>
        </div>

        <SectionCard title="Value by stage">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {byStage.map((row) => (
              <div
                key={row.stage}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  padding: "10px 12px",
                  borderRadius: 11,
                  background: "var(--t6)",
                  border: "1px solid var(--t19)",
                  borderLeft: `3px solid ${STAGES[row.stage].color}`,
                }}
              >
                <span
                  style={{ fontSize: 13.5, fontWeight: 600, flex: "0 0 140px" }}
                >
                  {STAGES[row.stage].label}
                </span>
                <span
                  className="upf-mono"
                  style={{ fontSize: 11.5, color: "var(--t34)" }}
                >
                  {row.count} {row.count === 1 ? "lead" : "leads"}
                </span>
                <span
                  className="upf-mono"
                  style={{
                    marginLeft: "auto",
                    fontSize: 12.5,
                    fontWeight: 500,
                    color: ink("#E9A83B", theme),
                    flex: "0 0 auto",
                  }}
                >
                  {money(row.value)}/mo
                </span>
              </div>
            ))}
          </div>

          <p
            style={{
              margin: "12px 0 0",
              fontSize: 11.5,
              color: "var(--t34)",
              lineHeight: 1.6,
            }}
          >
            Converted revenue is reported as Active MRR and excluded here — it
            is already won, not still on the table. Package and add-on prices
            are set in <Link href="/settings">Settings</Link>.
          </p>
        </SectionCard>
      </div>
    </>
  );
}

function sum(leads: DerivedLead[]): number {
  return leads.reduce((acc, lead) => acc + lead.mrrCents, 0);
}

/** "September 2026" from an ISO date, read as UTC so the month cannot slip. */
function monthLabel(iso: string): string {
  const [year, month] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

const cell = {
  padding: "12px 16px",
  fontSize: 13,
  color: "var(--t39)",
  borderBottom: "1px solid var(--t16)",
} as const;

const numeric = {
  textAlign: "right",
  fontFamily: "var(--font-mono), ui-monospace, monospace",
  fontSize: 12,
} as const;
