"use client";

import { useMemo } from "react";

import { useHub } from "@/components/HubStore";
import { useUi } from "@/components/Shell";
import {
  dueMeta,
  leadMrrCents,
  nextStep,
  type DueMeta,
  type NextStep,
} from "@/lib/engine";
import type { Lead, Tag, Workspace } from "@/lib/types";

/**
 * A lead plus everything the views compute from it.
 *
 * Derived in one place so the queue, the board, the table and the drawer can
 * never disagree about when a touch is due - the commonest way a CRM starts
 * being distrusted is two screens showing two different answers.
 */
export type DerivedLead = Lead & {
  step: NextStep;
  due: DueMeta;
  mrrCents: number;
  tags: Tag[];
  /** Extra accounts beyond the primary, for the "+2 more" affordances. */
  extraAccounts: number;
};

export function derive(lead: Lead, ws: Workspace, now: Date): DerivedLead {
  const step = nextStep(lead, ws.cadences[lead.stage], now);

  return {
    ...lead,
    step,
    due: dueMeta(step),
    mrrCents: leadMrrCents(lead, ws),
    tags: lead.tagIds
      .map((id) => ws.tags.find((t) => t.id === id))
      .filter((t): t is Tag => Boolean(t)),
    extraAccounts: Math.max(0, lead.socials.length - 1),
  };
}

/**
 * Every lead, derived, filtered by the header search.
 *
 * `now` is pinned once per render pass rather than read inside each lead, so a
 * list cannot straddle midnight and show two different day counts.
 */
export function useDerivedLeads(): DerivedLead[] {
  const { ws } = useHub();
  const { query } = useUi();

  return useMemo(() => {
    const now = new Date();
    const derived = ws.leads.map((lead) => derive(lead, ws, now));

    const needle = query.trim().toLowerCase();
    if (!needle) return derived;

    return derived.filter((lead) => matches(lead, needle, ws));
  }, [ws, query]);
}

/**
 * Search covers every social handle and platform, not just the primary.
 *
 * A creator is often known to one rep by their TikTok and to another by their
 * YouTube; a search that only looked at the primary account would tell the
 * second rep the lead does not exist, and they would add it again.
 */
function matches(lead: DerivedLead, needle: string, ws: Workspace): boolean {
  const source = ws.sources.find((s) => s.id === lead.sourceId)?.name ?? "";

  const haystack = [
    lead.name,
    source,
    ...lead.tags.map((t) => t.name),
    ...lead.socials.flatMap((s) => [s.handle, s.platform]),
  ];

  return haystack.some((value) => value.toLowerCase().includes(needle));
}

/** Derived view of a single lead, or null once it has been deleted. */
export function useDerivedLead(leadId: string | null): DerivedLead | null {
  const { ws } = useHub();

  return useMemo(() => {
    if (!leadId) return null;
    const lead = ws.leads.find((l) => l.id === leadId);
    return lead ? derive(lead, ws, new Date()) : null;
  }, [ws, leadId]);
}
