import { STAGES, type StageId } from "@/lib/stages";
import type { Cadence, Lead, Package, Addon, Workspace } from "@/lib/types";

/* ---------------------------------------------------------------------------
   The retarget engine.

   Every lead sits on a clock. When it enters a stage, that stage's ladder
   schedules the next touch; when the ladder is exhausted the lead becomes due
   to demote. Nothing here mutates - these are pure reads over a lead plus the
   cadence configured in Settings, so the same functions serve the list views,
   the drawer and the revenue forecast without drifting apart.
   --------------------------------------------------------------------------- */

const MS_PER_DAY = 86_400_000;

/**
 * Whole days since the lead entered its current stage.
 *
 * Compared at UTC midnight rather than by elapsed milliseconds: a touch due
 * "today" must read as today for the whole day, not flip to overdue at the
 * hour the lead happened to be created.
 */
export function daysInStage(lead: Lead, now: Date = new Date()): number {
  const entered = Date.parse(lead.stageEnteredAt);
  if (Number.isNaN(entered)) return 0;
  const a = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const e = new Date(entered);
  const b = Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate());
  return Math.max(0, Math.round((a - b) / MS_PER_DAY));
}

export type NextStep = {
  label: string;
  /** Days until due. Negative = overdue. null = this lead has no clock. */
  dueIn: number | null;
  /** True when this is the demotion itself rather than another touch. */
  terminal: boolean;
  /** Day-of-stage the step is scheduled for, null for a demotion. */
  day: number | null;
};

/**
 * The one thing this lead owes next.
 *
 * `touches` indexes into the ladder, so logging a touch advances the schedule
 * by moving to the next rung. Past the last rung the lead is due to demote -
 * surfaced for approval, never fired automatically.
 */
export function nextStep(lead: Lead, cadence: Cadence, now?: Date): NextStep {
  const stage = STAGES[lead.stage];
  const elapsed = daysInStage(lead, now);
  const step = cadence.steps[lead.touches];

  if (step) {
    return {
      label: step.label,
      dueIn: step.day - elapsed,
      terminal: false,
      day: step.day,
    };
  }

  if (stage.next) {
    return {
      label: stage.demote,
      dueIn: cadence.demoteDay - elapsed,
      terminal: true,
      day: null,
    };
  }

  return {
    label: lead.stage === "converted" ? "Managed client" : "Closed out",
    dueIn: null,
    terminal: true,
    day: null,
  };
}

export type DueTone = "over" | "today" | "soon" | "later" | "none";

export type DueMeta = {
  text: string;
  tone: DueTone;
  /** Overdue and due-today both pulse their dot; nothing else does. */
  urgent: boolean;
};

export function dueMeta(step: NextStep): DueMeta {
  if (step.dueIn === null) return { text: "—", tone: "none", urgent: false };
  if (step.dueIn < 0)
    return { text: `${Math.abs(step.dueIn)}d over`, tone: "over", urgent: true };
  if (step.dueIn === 0) return { text: "Today", tone: "today", urgent: true };
  if (step.dueIn <= 3)
    return { text: `in ${step.dueIn}d`, tone: "soon", urgent: false };
  return { text: `in ${step.dueIn}d`, tone: "later", urgent: false };
}

/** True when the ladder is spent and the demote day has arrived. */
export function isDueToDemote(lead: Lead, cadence: Cadence, now?: Date): boolean {
  const step = nextStep(lead, cadence, now);
  return step.terminal && step.dueIn !== null && step.dueIn <= 0;
}

/* --- Colour ---------------------------------------------------------------- */

export type Theme = "dark" | "light";

/**
 * Darkens a brand hue enough to read as text on a light surface.
 *
 * The hue stays constant across themes - only its ink changes - so a Hot lead
 * is recognisably the same orange in both. Known hues get a hand-picked value;
 * anything else (a tag the user coloured themselves) falls back to a 52%
 * darkener, which clears 4.5:1 against the light card surface.
 */
const LIGHT_INK: Record<string, string> = {
  "#E9A83B": "#8A5F0C",
  "#F2683C": "#A83A15",
  "#5B9BD5": "#1F5A8A",
  "#C9A227": "#5C4A08",
  "#3FBF7F": "#14663D",
  "#8B7BD8": "#453A8C",
  "#6B6560": "#4E4943",
  "#D96B8F": "#8E2F4F",
  "#F5C46B": "#8A5F0C",
};

export function ink(hex: string, theme: Theme): string {
  if (theme !== "light" || typeof hex !== "string" || hex[0] !== "#") return hex;

  const known = LIGHT_INK[hex.toUpperCase()];
  if (known) return known;

  const n = Number.parseInt(hex.slice(1), 16);
  if (Number.isNaN(n)) return hex;

  const darken = (v: number) => Math.max(0, Math.round(v * 0.52));
  return (
    "#" +
    [darken((n >> 16) & 255), darken((n >> 8) & 255), darken(n & 255)]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

/* --- Money ----------------------------------------------------------------- */

/**
 * Monthly recurring revenue for a lead: its package plus every add-on.
 *
 * A quoted override wins when set - some deals are priced off the rate card,
 * and the number the client agreed to is the one the forecast should use.
 */
export function leadMrrCents(lead: Lead, ws: Pick<Workspace, "packages" | "addons">): number {
  if (lead.quotedValueCents !== null) return lead.quotedValueCents;

  const pkg = ws.packages.find((p) => p.id === lead.packageId);
  const base = pkg ? pkg.priceCents : 0;

  const addons = lead.addonIds.reduce((sum, id) => {
    const a = ws.addons.find((x) => x.id === id);
    return sum + (a ? a.priceCents : 0);
  }, 0);

  return base + addons;
}

export function packageOf(lead: Lead, packages: Package[]): Package | null {
  return packages.find((p) => p.id === lead.packageId) ?? null;
}

export function addonsOf(lead: Lead, addons: Addon[]): Addon[] {
  return lead.addonIds
    .map((id) => addons.find((a) => a.id === id))
    .filter((a): a is Addon => Boolean(a));
}

/** $4.8k above a thousand, $600 below it. Matches the chips in the design. */
export function money(cents: number): string {
  const n = cents / 100;
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${Math.round(n)}`;
}

export function moneyFull(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/* --- Misc ------------------------------------------------------------------ */

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** "just now", "3 days ago", "last month" - enough precision for a touch log. */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";

  const mins = Math.round((now.getTime() - then) / 60_000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} min ago`;

  const hours = Math.round(mins / 60);
  if (hours < 24) return hours === 1 ? "an hour ago" : `${hours} hours ago`;

  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;

  const months = Math.round(days / 30);
  return months === 1 ? "last month" : `${months} months ago`;
}

export function stageColor(stage: StageId): string {
  return STAGES[stage].color;
}

/** Alpha suffixes the design leans on: wash, avatar wash, border, active. */
export const ALPHA = {
  wash: "14",
  avatar: "1A",
  border: "2E",
  borderStrong: "33",
  active: "55",
} as const;
